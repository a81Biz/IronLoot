import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerType, Wallet, Ledger, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  StructuredLogger,
  ChildLogger,
  InsufficientBalanceException,
} from '../../common/observability';
import { WalletCalculation } from '@ironloot/core';

@Injectable()
export class WalletService {
  private readonly log: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
  ) {
    this.log = this.logger.child('WalletService');
  }

  /**
   * Get or create a user's wallet
   */
  async getWallet(userId: string): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (wallet) return wallet;

    return this.prisma.wallet.create({
      data: {
        userId,
        balance: 0,
        heldFunds: 0,
        isActive: false,
      },
    });
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: string): Promise<{
    available: Decimal;
    held: Decimal;
    pending: Decimal;
    currency: string;
    isActive: boolean;
  }> {
    const wallet = await this.getWallet(userId);
    return {
      available: wallet.balance,
      held: wallet.heldFunds,
      pending: wallet.pendingBalance, // PT-071 — ventas sin liquidar
      currency: wallet.currency,
      isActive: wallet.isActive,
    };
  }

  /**
   * PT-072 — Reintegra a disponible un retiro reservado que fue rechazado (reversa).
   */
  async refundWithdrawal(userId: string, amount: number, referenceId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');
      const amt = new Decimal(amount);
      const before = new Decimal(wallet.balance);
      const after = before.plus(amt);
      await tx.ledger.create({
        data: {
          walletId: wallet.id,
          type: LedgerType.ADJUSTMENT,
          amount: amt,
          balanceBefore: before,
          balanceAfter: after,
          referenceId,
          referenceType: 'WITHDRAWAL_REFUND',
          description: `Withdrawal refund for ${referenceId}`,
        },
      });
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: after } });
    });
  }

  /**
   * PT-071 — Libera el neto de una venta desde pendingBalance a disponible (balance),
   * al confirmarse la recepción o vencer la ventana de disputa. Registra SETTLEMENT_RELEASE.
   */
  async releaseSettlement(
    sellerId: string,
    amount: number,
    referenceId: string,
    outerTx?: Prisma.TransactionClient,
  ): Promise<void> {
    const run = async (tx: Prisma.TransactionClient) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: sellerId } });
      if (!wallet) throw new NotFoundException('Seller wallet not found');
      const amt = new Decimal(amount);
      const pendingBefore = new Decimal(wallet.pendingBalance);
      if (pendingBefore.lessThan(amt)) return; // idempotencia: nada que liberar
      const balanceBefore = new Decimal(wallet.balance);
      const balanceAfter = balanceBefore.plus(amt);
      await tx.ledger.create({
        data: {
          walletId: wallet.id,
          type: LedgerType.SETTLEMENT_RELEASE,
          amount: amt,
          balanceBefore,
          balanceAfter,
          referenceId,
          referenceType: 'ORDER',
          description: `Settlement released for ${referenceId}`,
        },
      });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter, pendingBalance: pendingBefore.minus(amt), isActive: true },
      });
    };
    if (outerTx) return run(outerTx);
    return this.prisma.$transaction(run);
  }

  /**
   * Deposit funds (Atomic)
   */
  async deposit(
    userId: string,
    amount: number,
    referenceId: string,
    referenceType = 'PAYMENT',
  ): Promise<{ wallet: Wallet; ledger: Ledger }> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    return this.prisma.$transaction(async (tx) => {
      // 1. Get current wallet
      //
      // PT-087 (F-10) — Si no existe, se crea aquí. El monedero se creaba de forma perezosa
      // al consultarlo, de modo que un usuario que nunca abrió su monedero no podía recibir
      // un depósito: se capturaron 321.50 MXN reales en PayPal y la acreditación murió con
      // «Wallet not found». Es peor por la vía garantizada, que corre en un cron: allí no hay
      // nadie navegando que provoque la creación perezosa.
      //
      // Un depósito **es** el momento en que un monedero debe existir. Va dentro de la misma
      // transacción que el asiento, así que o se crea y acredita, o no ocurre ninguna de las dos.
      const wallet =
        (await tx.wallet.findUnique({ where: { userId } })) ??
        (await tx.wallet.create({
          data: { userId, balance: 0, heldFunds: 0, isActive: true },
        }));

      const amountDecimal = new Decimal(amount);
      const newBalance = new Decimal(wallet.balance).plus(amountDecimal);

      // 2. Create Ledger Entry
      const ledger = await tx.ledger.create({
        data: {
          walletId: wallet.id,
          type: LedgerType.DEPOSIT,
          amount: amountDecimal,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          referenceId,
          referenceType,
          description: `Deposit of ${amount} ${wallet.currency}`,
        },
      });

      // Update Wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          isActive: true, // Activate on deposit
        },
      });

      this.log.info(`Deposit successful for user ${userId}`, {
        data: { userId, amount, referenceId, newBalance: newBalance.toNumber() },
      });
      return { wallet: updatedWallet, ledger };
    });
  }

  /**
   * Withdraw funds (Atomic & Strict Validation)
   */
  async withdraw(
    userId: string,
    amount: number,
    referenceId: string,
  ): Promise<{ wallet: Wallet; ledger: Ledger }> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const amountDecimal = new Decimal(amount);
      const currentBalance = new Decimal(wallet.balance);

      if (currentBalance.lessThan(amountDecimal)) {
        throw new InsufficientBalanceException(
          userId,
          amountDecimal.toNumber(),
          currentBalance.toNumber(),
        );
      }

      const newBalance = currentBalance.minus(amountDecimal);

      // Ledger
      const ledger = await tx.ledger.create({
        data: {
          walletId: wallet.id,
          type: LedgerType.WITHDRAWAL,
          amount: amountDecimal,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          referenceId,
          referenceType: 'WITHDRAWAL',
          description: `Withdrawal of ${amount} ${wallet.currency}`,
        },
      });

      // Update Wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      this.log.info(`Withdrawal successful for user ${userId}`, {
        data: { userId, amount, referenceId, newBalance: newBalance.toNumber() },
      });
      return { wallet: updatedWallet, ledger };
    });
  }

  /**
   * Hold funds for a bid (Atomic)
   */
  async holdFunds(
    userId: string,
    amount: number,
    referenceId: string,
    description: string,
  ): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (!wallet.isActive) throw new BadRequestException('Wallet is not active');

      const amountDecimal = new Decimal(amount);
      const currentBalance = new Decimal(wallet.balance);

      // Use WalletCalculation from @ironloot/core to validate fund availability.
      // wallet.balance stores the available (spendable) balance; heldFunds are tracked separately.
      if (!WalletCalculation.canLockFunds(currentBalance.toNumber(), 0, amount)) {
        throw new InsufficientBalanceException(userId, amount, currentBalance.toNumber());
      }

      const newBalance = currentBalance.minus(amountDecimal);
      const newHeldNum = WalletCalculation.calculateNewHeldFunds(
        new Decimal(wallet.heldFunds).toNumber(),
        amount,
      );
      const newHeld = new Decimal(newHeldNum);

      // Ledger
      await tx.ledger.create({
        data: {
          walletId: wallet.id,
          type: LedgerType.HOLD_BID,
          amount: amountDecimal,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          referenceId,
          referenceType: 'AUCTION_BID',
          description: description || `Hold for auction ${referenceId}`,
        },
      });

      // Update Wallet
      return tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          heldFunds: newHeld,
        },
      });
    });
  }

  /**
   * Release held funds (Atomic)
   */
  async releaseFunds(
    userId: string,
    amount: number,
    referenceId: string,
    description: string,
  ): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const amountDecimal = new Decimal(amount);
      const currentHeld = new Decimal(wallet.heldFunds);

      if (currentHeld.lessThan(amountDecimal)) {
        throw new BadRequestException('Cannot release more than is held');
      }

      const newHeld = currentHeld.minus(amountDecimal);
      const newBalance = new Decimal(wallet.balance).plus(amountDecimal);

      // Ledger
      await tx.ledger.create({
        data: {
          walletId: wallet.id,
          type: LedgerType.RELEASE_BID,
          amount: amountDecimal,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          referenceId,
          referenceType: 'AUCTION_RELEASE',
          description: description || `Release hold for ${referenceId}`,
        },
      });

      // Update Wallet
      return tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          heldFunds: newHeld,
        },
      });
    });
  }

  /**
   * Capture held funds and Credit Seller (Atomic)
   * Flows:
   * 1. Debit Buyer (Release Hold -> DEBIT_ORDER)
   * 2. Credit Seller (CREDIT_SALE)
   * 3. Debit Platform Fee from Seller (FEE_PLATFORM)
   */
  async captureHeldFunds(
    buyerId: string,
    sellerId: string,
    amount: number,
    referenceId: string, // AuctionId/OrderId
    description: string,
    outerTx?: Prisma.TransactionClient,
    // PT-042 (AUD-005): platform commission percent (0–100). The orchestrator passes the
    // admin-configured rate so the actual charge is no longer a hardcoded magic number.
    feePercent = 10,
  ): Promise<void> {
    const execute = async (tx: Prisma.TransactionClient) => {
      const amountDecimal = new Decimal(amount);
      const feePercentage = new Decimal(feePercent).div(100); // configurable platform fee
      const feeAmount = amountDecimal.mul(feePercentage);
      // const sellerNet = amountDecimal.minus(feeAmount); // Unused

      // --- 1. BUYER SIDE (Debit) ---
      const buyerWallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
      if (!buyerWallet) throw new NotFoundException('Buyer wallet not found');

      const currentHeld = new Decimal(buyerWallet.heldFunds);
      if (currentHeld.lessThan(amountDecimal)) {
        throw new InsufficientBalanceException(
          buyerId,
          amountDecimal.toNumber(),
          currentHeld.toNumber(),
        );
      }

      const newHeld = currentHeld.minus(amountDecimal);
      // Balance was already reduced during HOLD. We update heldFunds.
      // We record DEBIT_ORDER to allow tracking expense in history.
      // Note: Balance doesn't change here, but we record it for Statement.

      await tx.ledger.create({
        data: {
          walletId: buyerWallet.id,
          type: LedgerType.DEBIT_ORDER,
          amount: amountDecimal,
          balanceBefore: buyerWallet.balance,
          balanceAfter: buyerWallet.balance, // Unchanged active balance
          referenceId,
          referenceType: 'ORDER',
          description: description || `Payment for ${referenceId}`,
        },
      });

      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: { heldFunds: newHeld },
      });

      // --- 2. SELLER SIDE (Credit) ---
      // Ensure seller wallet exists
      let sellerWallet = await tx.wallet.findUnique({ where: { userId: sellerId } });
      if (!sellerWallet) {
        // Auto-create wallet for seller if not exists (should explicitly exist, but safe fallback)
        sellerWallet = await tx.wallet.create({
          data: { userId: sellerId, balance: 0, isActive: true },
        });
      }

      // PT-071 — Holdback: el ingreso de venta NO va a disponible; entra a pendingBalance
      // hasta que se libere (confirmación de recepción o vencimiento de la ventana de disputa).
      // El saldo DISPONIBLE del vendedor no cambia aquí.
      const sellerAvailable = new Decimal(sellerWallet.balance);
      const sellerNet = amountDecimal.minus(feeAmount);

      // Credit Sale (a pending; disponible sin cambio)
      await tx.ledger.create({
        data: {
          walletId: sellerWallet.id,
          type: LedgerType.CREDIT_SALE,
          amount: amountDecimal,
          balanceBefore: sellerAvailable,
          balanceAfter: sellerAvailable,
          referenceId,
          referenceType: 'ORDER',
          description: `Sale proceeds (pending clearance) for ${referenceId}`,
        },
      });

      // Debit Fee (informativo; se descuenta del neto pendiente)
      await tx.ledger.create({
        data: {
          walletId: sellerWallet.id,
          type: LedgerType.FEE_PLATFORM,
          amount: feeAmount,
          balanceBefore: sellerAvailable,
          balanceAfter: sellerAvailable,
          referenceId,
          referenceType: 'FEE',
          description: `Platform fee for ${referenceId}`,
        },
      });

      // Update Seller Wallet: neto a pendingBalance
      const newPending = new Decimal(sellerWallet.pendingBalance).plus(sellerNet);
      await tx.wallet.update({
        where: { id: sellerWallet.id },
        data: { pendingBalance: newPending, isActive: true },
      });

      this.log.info(`Captured funds: Buyer ${buyerId} -> Seller ${sellerId} (Fee: ${feeAmount})`, {
        referenceId,
        amount: amount,
        fee: feeAmount.toNumber(),
      });
    };

    if (outerTx) {
      return execute(outerTx);
    }
    return this.prisma.$transaction(execute);
  }

  async getHistory(userId: string, limit = 10, types?: LedgerType[]): Promise<Ledger[]> {
    const wallet = await this.getWallet(userId);
    const whereClause: any = { walletId: wallet.id };

    if (types && types.length > 0) {
      whereClause.type = { in: types };
    }

    return this.prisma.ledger.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Calculate total withdrawals for the last 24 hours
   */
  async getDailyWithdrawals(userId: string): Promise<number> {
    const wallet = await this.getWallet(userId);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = await this.prisma.ledger.aggregate({
      where: {
        walletId: wallet.id,
        type: LedgerType.WITHDRAWAL,
        createdAt: { gte: yesterday },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount ? Number(result._sum.amount) : 0;
  }
}

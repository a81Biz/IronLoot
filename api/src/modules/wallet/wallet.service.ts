import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerType, Wallet, Ledger } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  StructuredLogger,
  ChildLogger,
  InsufficientBalanceException,
} from '../../common/observability';

@Injectable()
export class WalletService {
  private readonly log: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
  ) {
    this.log = this.logger.child('WalletService');
  }

  // ... (keeping existing methods until we hit the captureHeldFunds or others if we are replacing whole file, but replace_file_content targets chunks)
  // Wait, I can't replace scattered chunks easily with one call if they are far apart unless using multi_replace.
  // I will use replace_file_content for IMPORTS first.

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
  async getBalance(
    userId: string,
  ): Promise<{ available: Decimal; held: Decimal; currency: string; isActive: boolean }> {
    const wallet = await this.getWallet(userId);
    return {
      available: wallet.balance,
      held: wallet.heldFunds,
      currency: wallet.currency,
      isActive: wallet.isActive,
    };
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
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

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

      if (currentBalance.lessThan(amountDecimal)) {
        throw new InsufficientBalanceException(
          userId,
          amountDecimal.toNumber(),
          currentBalance.toNumber(),
        );
      }

      const newBalance = currentBalance.minus(amountDecimal);
      const newHeld = new Decimal(wallet.heldFunds).plus(amountDecimal);

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
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const amountDecimal = new Decimal(amount);
      const feePercentage = new Decimal(0.1); // 10% Platform Fee
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

      const sellerBalanceBefore = new Decimal(sellerWallet.balance);
      const sellerBalanceAfterSale = sellerBalanceBefore.plus(amountDecimal);

      // Credit Sale
      await tx.ledger.create({
        data: {
          walletId: sellerWallet.id,
          type: LedgerType.CREDIT_SALE,
          amount: amountDecimal,
          balanceBefore: sellerBalanceBefore,
          balanceAfter: sellerBalanceAfterSale,
          referenceId,
          referenceType: 'ORDER',
          description: `Sale proceeds for ${referenceId}`,
        },
      });

      // Use intermediate balance
      const sellerBalanceAfterFee = sellerBalanceAfterSale.minus(feeAmount);

      // Debit Fee
      await tx.ledger.create({
        data: {
          walletId: sellerWallet.id,
          type: LedgerType.FEE_PLATFORM,
          amount: feeAmount,
          balanceBefore: sellerBalanceAfterSale,
          balanceAfter: sellerBalanceAfterFee,
          referenceId,
          referenceType: 'FEE',
          description: `Platform fee (10%) for ${referenceId}`,
        },
      });

      // Update Seller Wallet
      await tx.wallet.update({
        where: { id: sellerWallet.id },
        data: { balance: sellerBalanceAfterFee },
      });

      this.log.info(`Captured funds: Buyer ${buyerId} -> Seller ${sellerId} (Fee: ${feeAmount})`, {
        referenceId,
        amount: amount,
        fee: feeAmount.toNumber(),
      });
    });
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

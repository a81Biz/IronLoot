import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerType, Wallet, Ledger } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { StructuredLogger, ChildLogger } from '../../common/observability';

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

      // 3. Update Wallet
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
        throw new BadRequestException('Insufficient available funds');
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
        throw new BadRequestException('Insufficient available funds for hold');
      }

      const newBalance = currentBalance.minus(amountDecimal);
      const newHeld = new Decimal(wallet.heldFunds).plus(amountDecimal);

      // Ledger
      await tx.ledger.create({
        data: {
          walletId: wallet.id,
          type: LedgerType.HOLD,
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

      // Only release what is held? Or allow correction?
      // Strict: Held funds > amount.
      // But in race conditions or partials, maybe we just do best effort?
      // Let's enforce strictness for now.
      if (currentHeld.lessThan(amountDecimal)) {
        // This might happen if data is inconsistent. Log error but try to recover?
        // For now, throw to detect bugs.
        throw new BadRequestException('Cannot release more than is held');
      }

      const newHeld = currentHeld.minus(amountDecimal);
      const newBalance = new Decimal(wallet.balance).plus(amountDecimal);

      // Ledger
      await tx.ledger.create({
        data: {
          walletId: wallet.id,
          type: LedgerType.RELEASE,
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
   * Capture held funds (Purchase from Hold)
   */
  async captureHeldFunds(
    userId: string,
    amount: number,
    referenceId: string,
    description: string,
  ): Promise<Wallet> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const amountDecimal = new Decimal(amount);
      const currentHeld = new Decimal(wallet.heldFunds);

      if (currentHeld.lessThan(amountDecimal)) {
        throw new BadRequestException('Insufficient active hold to capture');
      }

      const newHeld = currentHeld.minus(amountDecimal);
      // Balance does not change (it was already deducted from available),
      // but held funds decrease (consumed).
      // Wait, "Held" is not "Spent". "Held" is "Reserved".
      // When we capture, we remove from "Held" and it disappears from the wallet entirely (goes to system/seller).
      // So balance remains reduced (it was reduced at Hold time).
      // But we need to record a PURCHASE in ledger to explain where the money went finally?
      // Actually, HOLD reduced "balance" (Available).
      // So effectively the money is already "gone" from Available.
      // PURCHASE should just confirm it.
      // But wait, if I check Ledger logic:
      // Hold: Balance - X, Held + X.
      // Release: Balance + X, Held - X.
      // Purchase (from Hold): Held - X. (Balance stays same).

      // Ledger entry for Purchase:
      // What is "balanceBefore"?
      // If we only track "Available Balance" in Ledger entries 'balanceBefore'/'balanceAfter',
      // then Purchase from Hold doesn't change Available Balance.
      // But it MUST look like money left.
      // Maybe Ledger should record "Held" change too? Or just focused on main balance?
      // Let's keep it simple: Ledger tracks "Available Balance".
      // But this operation is significant.
      // Let's say Purchase entry shows 0 change in balance? No, that's confusing.
      // The money left the user's possession.

      // Refinement: The PURCHASE event finalized the exit.
      // Technically the Ledger logic "BalanceBefore -> BalanceAfter" tracks Available.
      // So indeed, Purchase from Hold doesn't change Available.
      // But we should record it.

      await tx.ledger.create({
        data: {
          walletId: wallet.id,
          type: LedgerType.PURCHASE,
          amount: amountDecimal,
          balanceBefore: wallet.balance, // Unchanged
          balanceAfter: wallet.balance, // Unchanged
          referenceId,
          referenceType: 'AUCTION_WIN',
          description: description || `Purchase for ${referenceId}`,
        },
      });

      // Update Wallet
      return tx.wallet.update({
        where: { id: wallet.id },
        data: { heldFunds: newHeld },
      });
    });
  }

  async getHistory(userId: string, limit = 10): Promise<Ledger[]> {
    const wallet = await this.getWallet(userId);
    return this.prisma.ledger.findMany({
      where: { walletId: wallet.id },
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

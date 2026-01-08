import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DepositDto, WithdrawDto, WalletBalanceDto, TransactionHistoryDto } from './dto/wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { PrismaService } from '../../database/prisma.service';
import {
  Log,
  AuditedAction,
  AuditEventType,
  EntityType,
  PaymentMismatchException,
} from '../../common/observability';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ... (existing methods)

  @Get('balance')
  @Log({ message: 'Get wallet balance' })
  @ApiOperation({ summary: 'Get current wallet balance' })
  @ApiResponse({ status: 200, type: WalletBalanceDto })
  async getBalance(@Request() req: AuthenticatedRequest): Promise<WalletBalanceDto> {
    const balance = await this.walletService.getBalance(req.user.id);
    return {
      available: Number(balance.available),
      held: Number(balance.held),
      currency: balance.currency,
      isActive: balance.isActive,
    };
  }

  @Get('history')
  @Log({ message: 'Get wallet history' })
  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: TransactionHistoryDto })
  async getHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<TransactionHistoryDto> {
    const history = await this.walletService.getHistory(req.user.id, limit);
    return {
      transactions: history.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        currency: 'USD', // Ledger doesn't store currency directly, assuming USD or derived from context
        status: 'COMPLETED', // Ledger entries are always completed
        createdAt: tx.createdAt,
        referenceId: tx.referenceId || '',
      })),
    };
  }

  @Post('deposit')
  // @Throttle({ default: { limit: 10, ttl: 60000 } }) // TODO: Install ThrottlerModule
  @AuditedAction(
    AuditEventType.PAYMENT_CONFIRMED,
    EntityType.PAYMENT,
    (args) => args[1].referenceId, // dto is 2nd arg
    ['amount', 'referenceId'], // payload
  )
  @ApiOperation({ summary: 'Deposit funds' })
  @ApiResponse({ status: 201, description: 'Deposit successful' })
  @ApiResponse({ status: 400, description: 'Invalid payment' })
  async deposit(@Request() req: AuthenticatedRequest, @Body() dto: DepositDto) {
    // 1. Verify that the payment reference is valid and completed
    const payment = await this.paymentsService.verifyPayment(dto.referenceId);

    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException(`Payment verification failed: status is ${payment.status}`);
    }

    // 2. Use the amount from the VERIFIED payment, not the user input
    // This prevents users from paying $1 and claiming $1000
    if (payment.amount !== dto.amount) {
      // Optionally throw or just use the real amount.
      // Throwing is safer to alert the user of mismatch
      throw new PaymentMismatchException(Number(payment.amount), dto.amount);
    }

    return this.walletService.deposit(req.user.id, payment.amount, dto.referenceId);
  }

  @Post('withdraw')
  // @Throttle({ default: { limit: 5, ttl: 60000 } }) // TODO: Install ThrottlerModule
  @AuditedAction(
    AuditEventType.PAYMENT_INITIATED,
    EntityType.USER,
    (args) => args[0].user.id, // req is 1st arg
    ['amount'],
  )
  @ApiOperation({ summary: 'Withdraw funds' })
  @ApiResponse({ status: 201, description: 'Withdrawal successful' })
  @ApiResponse({ status: 400, description: 'Invalid amount or payment method' })
  async withdraw(@Request() req: AuthenticatedRequest, @Body() dto: WithdrawDto) {
    // 1. Validate Payment Method (Mock for now, should verify if user has this method registered)
    // const method = await this.paymentsService.getUserPaymentMethod(req.user.id, dto.referenceId);
    // if (!method) throw new BadRequestException('Invalid payment method');

    // 2. Verify Limits
    const DAILY_LIMIT = 5000;
    const dailyWithdrawn = await this.walletService.getDailyWithdrawals(req.user.id);
    if (dailyWithdrawn + dto.amount > DAILY_LIMIT) {
      throw new BadRequestException('Daily withdrawal limit exceeded');
    }

    return this.walletService.withdraw(req.user.id, dto.amount, dto.referenceId);
  }
}

import { Controller, Get, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../../modules/auth/decorators';
import { OrdersService } from '../orders/orders.service';
import { WalletService } from '../wallet/wallet.service';
import { LedgerType } from '@prisma/client';
import { TransactionHistoryDto } from '../wallet/dto/wallet.dto';
import { Log } from '../../common/observability';

@ApiTags('web-views')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller()
export class WebViewsController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Derived View: Won Auctions
   * Source: GET /orders (buyer)
   * Spec v0.2.2 Section 7
   */
  @Get('won-auctions')
  @ApiOperation({
    summary: 'Get won auctions (Derived View)',
    description: 'Alias for fetching user orders',
  })
  @ApiResponse({ status: 200, description: 'List of won auctions (orders)' })
  @Log({ message: 'Get won auctions view' })
  async getWonAuctions(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findAllForUser(user.id);
  }

  /**
   * Derived View: Payments
   * Source: GET /wallet/history (filtered)
   * Spec v0.2.2 Section 7
   */
  @Get('privacy')
  privacy() {
    return { view: 'pages/privacy' };
  }

  @Get('terms')
  terms() {
    return { view: 'pages/terms' };
  }

  @Get('payments')
  @ApiOperation({
    summary: 'Get payments (Derived View)',
    description: 'Wallet history filtered by Order/Sale transactions',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: TransactionHistoryDto })
  @Log({ message: 'Get payments view' })
  async getPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<TransactionHistoryDto> {
    // Filter by Spec: DEBIT_ORDER, CREDIT_SALE, FEE_PLATFORM
    // Note: TypeScript might complain about literal types not matching LedgerType enum if not cast or exact
    // We rely on the enum values being correct strings and runtime verification.
    const types: LedgerType[] = ['DEBIT_ORDER', 'CREDIT_SALE', 'FEE_PLATFORM'] as any[];

    const history = await this.walletService.getHistory(user.id, limit, types);

    return {
      transactions: history.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        currency: 'USD',
        status: 'COMPLETED',
        createdAt: tx.createdAt,
        referenceId: tx.referenceId || '',
      })),
    };
  }
}

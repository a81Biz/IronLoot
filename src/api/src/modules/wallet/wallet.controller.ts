import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  Param,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from '../payments/payments.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WithdrawDto, WalletBalanceDto, TransactionHistoryDto } from './dto/wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { WithdrawalsService } from './withdrawals.service';
import { AccountVerificationService } from './account-verification.service';
import { PrismaService } from '../../database/prisma.service';
import { Log, AuditedAction, AuditEventType, EntityType } from '../../common/observability';

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
    private readonly withdrawalsService: WithdrawalsService,
    private readonly accountVerification: AccountVerificationService,
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
      pending: Number(balance.pending),
      currency: balance.currency,
      isActive: balance.isActive,
    };
  }

  @Get('history')
  @Log({ message: 'Get wallet history' })
  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({
    name: 'types',
    required: false,
    type: String,
    description: 'Tipos de asiento separados por coma. Ej.: DEBIT_ORDER,CREDIT_SALE',
  })
  @ApiResponse({ status: 200, type: TransactionHistoryDto })
  async getHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('types') types?: string,
  ): Promise<TransactionHistoryDto> {
    // PT-229 (H-UI-044) — **`page` y `types` se ignoraban aqui.**
    //
    // El portal llamaba con `?page=N` y con `?types=DEBIT_ORDER,CREDIT_SALE` desde PT-067, y este
    // controlador no declaraba ninguno de los dos: la paginacion no existia y «Mis pagos» mostraba el
    // ledger COMPLETO, duplicando «Historial» en vez de filtrarlo.
    //
    // El filtro por tipos ya estaba implementado en el servicio. Lo unico que faltaba era pasarlo.
    const tipos = types
      ? (types
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean) as never[])
      : undefined;

    const historia = await this.walletService.getHistory(req.user.id, limit, tipos, page);

    return {
      transactions: historia.items.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        currency: 'MXN',
        status: 'COMPLETED', // Ledger entries are always completed
        createdAt: tx.createdAt,
        referenceId: tx.referenceId || '',
      })),
      total: historia.total,
      page: historia.page,
      limit: historia.limit,
    };
  }

  /**
   * PT-133 — `POST /wallet/deposit` RETIRADO.
   *
   * No lo invocaba ningun cliente: el unico llamante en todo `src/` era su propio test e2e. El
   * deposito real del portal usa `POST /payments/initiate` —lo llama
   * `public/js/pages/pages-wallet-deposit.js`— que es el ciclo de pago de PT-080 con las garantias
   * de PT-087, documentado en `docs-v2/4-ingenieria/Catalogo-de-API.md`.
   *
   * Se retira en vez de corregirse (H-018 describia que un fallo de la pasarela salia como 500)
   * porque **acreditaba dinero**: recibia un `referenceId` elegido por el cliente, lo verificaba
   * contra la pasarela y abonaba el monedero. Superficie que mueve saldo, sin llamantes, sin
   * cobertura y sin nadie que la mantenga. Pulirle el manejo de errores habria sido arreglar una
   * puerta que sobra.
   *
   * `WalletService.deposit()` NO se retira: es lo que usa `creditWallet` en la via real.
   */

  // PT-070 — Métodos de pago bancarios (destino del retiro)
  @Post('payment-methods')
  @ApiOperation({ summary: 'Register a bank account (CLABE) for withdrawals' })
  async addPaymentMethod(
    @Request() req: AuthenticatedRequest,
    @Body() dto: { bankName?: string; clabe: string; holderName: string; alias?: string },
  ) {
    return this.paymentsService.addBankAccount(req.user.id, dto);
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'List my registered payment methods' })
  async listPaymentMethods(@Request() req: AuthenticatedRequest) {
    return this.paymentsService.listPaymentMethods(req.user.id);
  }

  // PT-092 — Cuenta de PayPal como destino. Solo se admite UNA por vendedor.
  @Post('payment-methods/paypal')
  @ApiOperation({ summary: 'Registrar una cuenta de PayPal como destino de cobro' })
  @ApiResponse({ status: 201, description: 'Cuenta registrada, sin verificar todavia' })
  @ApiResponse({ status: 400, description: 'Correo invalido o ya hay un PayPal registrado' })
  async addPaypalMethod(
    @Request() req: AuthenticatedRequest,
    @Body() dto: { paypalEmail: string; alias?: string },
  ) {
    return this.paymentsService.addPaypalAccount(req.user.id, dto);
  }

  /**
   * PT-092 — Abre la verificacion de una cuenta.
   *
   * Genera el codigo que viajara con el movimiento de dinero. **La respuesta NO lo incluye**:
   * si lo devolviera aqui, quien pide la verificacion sabria el codigo sin haber accedido nunca
   * a la cuenta, y la verificacion no probaria nada.
   */
  @Post('payment-methods/:id/verify')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Iniciar la verificacion de una cuenta de cobro' })
  @ApiResponse({ status: 201, description: 'Verificacion abierta' })
  @ApiResponse({ status: 400, description: 'Saldo insuficiente o cuenta ya verificada' })
  @ApiResponse({ status: 404, description: 'No existe o no es del usuario' })
  async startVerification(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const v = await this.accountVerification.start(req.user.id, id);
    return {
      id: v.id,
      status: v.status,
      amount: v.amount,
      currency: v.currency,
      expiresAt: v.expiresAt,
      // Deliberadamente sin `token`.
      instructions:
        'Te enviaremos este importe con un codigo de 6 caracteres como referencia. ' +
        'Busca el codigo en tu cuenta y confirmalo aqui.',
    };
  }

  /**
   * PT-092 — El vendedor declara el codigo que vio en su cuenta.
   *
   * Limitado por `Throttle` ademas de por los 5 intentos del servicio: el limite de intentos
   * protege la cuenta concreta; el throttle, la fuerza bruta distribuida.
   */
  @Post('payment-methods/:id/verify/confirm')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Confirmar el codigo de verificacion' })
  @ApiResponse({ status: 201, description: 'Resultado de la comprobacion' })
  async confirmVerification(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: { token: string },
  ) {
    return this.accountVerification.confirm(req.user.id, id, dto?.token ?? '');
  }

  // PT-072 — Solicitud de retiro (reemplaza el retiro inmediato: ahora requiere aprobación admin).
  @Post('withdrawals')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @AuditedAction(AuditEventType.PAYMENT_INITIATED, EntityType.USER, (args) => args[0].user.id, [
    'amount',
  ])
  @ApiOperation({ summary: 'Request a withdrawal (requires admin approval)' })
  async requestWithdrawal(
    @Request() req: AuthenticatedRequest,
    @Body() dto: { amount: number; paymentMethodId: string },
  ) {
    return this.withdrawalsService.request(req.user.id, dto);
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'List my withdrawal requests' })
  async myWithdrawals(@Request() req: AuthenticatedRequest) {
    return this.withdrawalsService.listMine(req.user.id);
  }

  // Compat: el antiguo POST /withdraw ahora crea una solicitud (no descuenta sin aprobación).
  @Post('withdraw')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @AuditedAction(AuditEventType.PAYMENT_INITIATED, EntityType.USER, (args) => args[0].user.id, [
    'amount',
  ])
  @ApiOperation({ summary: 'Deprecated — use POST /wallet/withdrawals' })
  async withdraw(@Request() req: AuthenticatedRequest, @Body() dto: WithdrawDto) {
    return this.withdrawalsService.request(req.user.id, {
      amount: dto.amount,
      paymentMethodId: dto.referenceId,
    });
  }
}

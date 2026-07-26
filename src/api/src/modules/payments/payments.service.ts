import { Injectable, BadRequestException } from '@nestjs/common';
import { UserPaymentMethod, PaymentProvider } from '@prisma/client';
import { isValidClabe } from '../wallet/clabe.util';
import { StripeProvider } from './providers/stripe.provider';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { PaypalProvider } from './providers/paypal.provider';
import { HeyBancoProvider } from './providers/heybanco.provider';
import { PaymentProviderEnum, WebhookResult } from './interfaces';
import { WalletService } from '../wallet/wallet.service';
import { PrismaService } from '../../database/prisma.service';
import { PaymentCycleService, CycleDecision } from './payment-cycle.service';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { StructuredLogger } from '../../common/observability';

export interface PaymentVerification {
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  amount: number;
  currency: string;
  provider: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly logger: StructuredLogger,
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripeProvider,
    private readonly mercadopagoProvider: MercadoPagoProvider,
    private readonly paypalProvider: PaypalProvider,
    private readonly heyBancoProvider: HeyBancoProvider,
    private readonly walletService: WalletService,
    private readonly paymentCycle: PaymentCycleService,
    private readonly registry: PaymentProviderRegistry,
  ) {}

  async getUserPaymentMethod(
    userId: string,
    referenceId: string,
  ): Promise<UserPaymentMethod | null> {
    return this.prisma.userPaymentMethod.findFirst({
      where: { userId, referenceId, isActive: true },
    });
  }

  /**
   * PT-070 — Registrar una cuenta bancaria (CLABE) como método de pago para retiros.
   * Valida el dígito verificador de la CLABE y exige nombre del titular.
   */
  async addBankAccount(
    userId: string,
    dto: { bankName?: string; clabe: string; holderName: string; alias?: string },
  ): Promise<UserPaymentMethod> {
    if (!isValidClabe(dto.clabe)) {
      throw new BadRequestException('CLABE inválida (18 dígitos con verificador)');
    }
    if (!dto.holderName || !dto.holderName.trim()) {
      throw new BadRequestException('El nombre del titular es requerido');
    }
    const existing = await this.prisma.userPaymentMethod.findFirst({
      where: { userId, referenceId: dto.clabe },
    });
    if (existing) {
      throw new BadRequestException('Esta CLABE ya está registrada');
    }
    return this.prisma.userPaymentMethod.create({
      data: {
        userId,
        referenceId: dto.clabe, // la CLABE identifica el método
        bankName: dto.bankName ?? null,
        clabe: dto.clabe,
        holderName: dto.holderName.trim(),
        alias: dto.alias ?? null,
        isVerified: false,
        isActive: true,
      },
    });
  }

  async listPaymentMethods(userId: string): Promise<UserPaymentMethod[]> {
    return this.prisma.userPaymentMethod.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Initiate a payment flow (Deposit)
   */
  async initiatePayment(
    userId: string,
    email: string,
    amount: number,
    providerStr: string,
    description = 'Wallet Deposit',
  ) {
    const provider = providerStr as PaymentProviderEnum;
    const orderId = `DEP-${userId}-${Date.now()}`;
    const currency = 'MXN';

    // PT-080 — Fase SOLICITUD. El ciclo nace aqui, no al recibir la notificacion: una
    // solicitud abierta sin confirmacion es la senal de que hay dinero cobrado sin acreditar.
    await this.paymentCycle.open({
      provider: provider as unknown as PaymentProvider,
      reference: orderId,
      userId,
      amount,
      currency,
    });

    // PT-080 — El nucleo no conoce pasarelas: el registro resuelve el adaptador.
    const adapter = this.registry.resolve(provider);
    if (adapter && adapter.checkStatus()) {
      return adapter.createPayment(orderId, amount, currency, description, email);
    }

    throw new BadRequestException('Unsupported or invalid payment provider');
  }

  /**
   * Payment verification
   */
  async verifyPayment(referenceId: string): Promise<PaymentVerification> {
    // 1. Determine Provider based on Reference ID prefix
    let result;
    let providerName = 'UNKNOWN';

    // MercadoPago (MP-...)
    if (referenceId.startsWith('MP-')) {
      result = await this.mercadopagoProvider.verifyPayment(referenceId);
      providerName = 'MERCADO_PAGO';
    }
    // PayPal (PAY-...)
    else if (referenceId.startsWith('PAY-')) {
      result = await this.paypalProvider.verifyPayment(referenceId);
      providerName = 'PAYPAL';
    }
    // Stripe (cs_...)
    else if (referenceId.startsWith('cs_')) {
      result = await this.stripeProvider.verifyPayment(referenceId);
      providerName = 'STRIPE';
    }

    if (result) {
      // PT-080 — El importe lo normaliza el adaptador; el nucleo no interpreta campos de pasarela.
      const amount = Number(result.amount ?? 0) || 0;

      return {
        status: result.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
        amount,
        currency: 'MXN',
        provider: providerName,
      };
    }

    throw new BadRequestException('Invalid or unsupported payment reference');
  }

  async createCheckoutSession(
    userId: string,
    email: string,
    dto: { amount: number; description?: string },
  ): Promise<any> {
    if (this.stripeProvider.checkStatus()) {
      return this.stripeProvider.createPayment(
        `DEP-${userId}-${Date.now()}`,
        dto.amount,
        'MXN',
        dto.description || 'Wallet Deposit',
        email,
      );
    }

    throw new BadRequestException('Provider not available');
  }

  async handleWebhook(
    provider: string,
    payload: any,
    headers: any = {},
    query: any = {},
  ): Promise<{ received: boolean }> {
    // PT-080 — El registro resuelve por clave o alias. La URL registrada en la pasarela no
    // siempre usa la clave canonica (`/webhook/mercadopago` -> MERCADO_PAGO, bug de PT-064).
    const adapter = this.registry.resolve(provider);
    if (!adapter) {
      this.logger.error(`Webhook de proveedor desconocido: ${provider}`);
      return { received: true };
    }
    provider = adapter.key;

    const result = await adapter.handleWebhook(payload, headers, query);

    // PT-080 — Fases CONFIRMACION y PERSISTENCIA.
    if (result) {
      const format = query?.['data.id'] ? 'WEBHOOK' : query?.topic ? 'IPN' : 'UNKNOWN';
      await this.applyProviderResult(provider, result, format);
    }

    return { received: true };
  }

  /**
   * PT-080 — Punto unico por el que pasa toda respuesta de una pasarela, llegue por
   * notificacion (via rapida) o por consulta periodica (via garantizada).
   *
   * El ciclo decide si procede acreditar; la barrera de idempotencia por identificador
   * canonico sigue aplicandose despues.
   */
  async applyProviderResult(
    provider: string,
    result: WebhookResult,
    format: string,
  ): Promise<CycleDecision> {
    const decision = await this.paymentCycle.evaluate(provider as PaymentProvider, result, format);

    if (!decision.shouldCredit) {
      this.logger.info(`Ciclo ${result.externalId}: ${decision.outcome} — no procede acreditar`);
      return decision;
    }

    await this.creditFromResult(provider, result);
    return decision;
  }

  private async creditFromResult(provider: string, result: WebhookResult): Promise<void> {
    if (result.status === 'COMPLETED') {
      // Extract UserId from Reference (DEP-UserId-Timestamp)
      // Referencia: DEP-<userId>-<timestamp>. userId es un UUID (con guiones), por lo que
      // no se puede usar split('-')[1]; se extrae todo entre "DEP-" y el "-<timestamp>" final.
      const refMatch = /^DEP-(.+)-\d+$/.exec(result.externalId);
      if (refMatch) {
        const userId = refMatch[1];
        // PT-080 — Cada adaptador normaliza su propio importe. El nucleo ya no conoce
        // `transaction_amount`, `mc_gross` ni `amountTotal`: si un adaptador no informa
        // `amount`, su deposito no acredita, y su propia suite debe cubrirlo.
        const amount = Number(result.amount ?? 0) || 0;

        if (amount > 0) {
          await this.creditOnce(provider, result, userId, amount);
        } else {
          this.logger.error(`Cannot credit wallet: amount not found in webhook metadata`, {
            data: result as unknown as Record<string, unknown>,
          });
        }
      }
    }
  }

  /**
   * Acredita el depósito una sola vez por pago de la pasarela.
   *
   * La clave es el identificador de **pago** del proveedor, no el de la notificación
   * (PT-078). Mercado Pago emite varias notificaciones distintas sobre un mismo pago
   * (`payment.created`, `payment.updated`), cada una con su propio id: deduplicar por
   * notificación dejaría pasar la segunda y acreditaría dos veces el mismo dinero.
   *
   * Se «reserva» el pago insertando su id. La restricción única `(provider, paymentId)`
   * es el punto de serialización entre entregas concurrentes, y una violación significa
   * «ya procesado».
   *
   * No es una transacción única con la acreditación porque `WalletService.deposit()`
   * abre la suya propia y no admite un cliente externo. Por eso, si la acreditación
   * falla, la reserva se libera y el error se propaga: la pasarela reintentará y el
   * reintento podrá acreditar.
   */
  private async creditOnce(
    provider: string,
    result: WebhookResult,
    userId: string,
    amount: number,
  ): Promise<void> {
    const paymentId = result.paymentId;

    if (!paymentId) {
      // Fail-open deliberado: sin id de pago no se puede deduplicar, pero se prefiere una
      // acreditación duplicada —detectable y corregible por ADJUSTMENT en el ledger— a un
      // depósito legítimo que nunca aparece. No se propaga el fallo: sin reserva, reintentar
      // duplicaría de verdad.
      this.logger.error('Webhook without paymentId — crediting without deduplication', {
        data: result as unknown as Record<string, unknown>,
      });
      await this.creditWallet(userId, amount, result.externalId).catch(() => undefined);
      return;
    }

    try {
      await this.prisma.processedWebhookEvent.create({
        data: { provider: provider as PaymentProvider, paymentId },
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        this.logger.info(`Payment ${paymentId} already credited — skipping duplicate`);
        return;
      }
      throw e;
    }

    try {
      await this.creditWallet(userId, amount, result.externalId);
    } catch (e) {
      // Se libera la reserva para no dejar el pago marcado como acreditado sin haberlo estado.
      await this.prisma.processedWebhookEvent
        .delete({
          where: { provider_paymentId: { provider: provider as PaymentProvider, paymentId } },
        })
        .catch(() => undefined);
      throw e;
    }
  }

  private async creditWallet(userId: string, amount: number, referenceId: string): Promise<void> {
    try {
      this.logger.info(`Crediting wallet for user ${userId} amount ${amount}`);
      await this.walletService.deposit(userId, amount, referenceId, 'DEPOSIT');
    } catch (e) {
      this.logger.error(`Failed to credit wallet for ${referenceId}`, { error: e as Error });
      throw e;
    }
  }

  getAvailableProviders(): string[] {
    // PT-080 — Derivado del registro. Antes se enumeraban los cuatro a mano.
    return this.registry.availableKeys();
  }

  async getMercadoPagoMethods() {
    return this.mercadopagoProvider.getMethods();
  }

  async processPayment(paymentData: any) {
    if (paymentData.provider === PaymentProviderEnum.MERCADO_PAGO) {
      return this.mercadopagoProvider.processPayment(paymentData);
    }
    throw new BadRequestException('Unsupported provider for direct processing');
  }
}

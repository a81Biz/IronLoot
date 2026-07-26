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
import { PaymentCycleService } from './payment-cycle.service';
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

    switch (provider) {
      case PaymentProviderEnum.MERCADO_PAGO:
        return this.mercadopagoProvider.createPayment(
          orderId,
          amount,
          currency,
          description,
          email,
        );

      case PaymentProviderEnum.PAYPAL:
        return this.paypalProvider.createPayment(orderId, amount, currency, description, email);

      case PaymentProviderEnum.STRIPE:
        if (this.stripeProvider.checkStatus()) {
          return this.stripeProvider.createPayment(orderId, amount, currency, description, email);
        }
        break;

      case PaymentProviderEnum.HEY_BANCO:
        if (this.heyBancoProvider.checkStatus()) {
          return this.heyBancoProvider.createPayment(orderId, amount, currency, description, email);
        }
        break;
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
      // Map Result to Verification
      const amount = result.metadata?.amountTotal
        ? Number(result.metadata.amountTotal) / 100
        : Number(result.metadata?.amount) || 0;

      return {
        status: result.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
        amount,
        currency: String(result.metadata?.currency || 'MXN').toUpperCase(),
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
    // Normalizar el proveedor: la URL del webhook puede llegar en minúsculas y sin guion bajo
    // (p. ej. /webhook/mercadopago) mientras el enum interno es MERCADO_PAGO. toUpperCase() no
    // basta ('mercadopago' → 'MERCADOPAGO' ≠ 'MERCADO_PAGO'); se usa un mapa de alias.
    const providerAliases: Record<string, string> = {
      MERCADOPAGO: 'MERCADO_PAGO',
      MERCADO_PAGO: 'MERCADO_PAGO',
      PAYPAL: 'PAYPAL',
      STRIPE: 'STRIPE',
      HEYBANCO: 'HEY_BANCO',
      HEY_BANCO: 'HEY_BANCO',
    };
    const normalizedProvider = (provider || '').toUpperCase();
    provider = providerAliases[normalizedProvider] ?? normalizedProvider;
    let result;
    if (provider === 'STRIPE') {
      result = await this.stripeProvider.handleWebhook(payload);
    } else if (provider === 'MERCADO_PAGO') {
      result = await this.mercadopagoProvider.handleWebhook(payload, headers, query);
    } else if (provider === 'PAYPAL') {
      // PT-076: Orders v2 verifica la firma con las cabeceras PAYPAL-*.
      result = await this.paypalProvider.handleWebhook(payload, headers);
    } else if (provider === 'HEY_BANCO') {
      result = await this.heyBancoProvider.handleWebhook(payload, headers);
    }

    // PT-080 — Fases CONFIRMACION y PERSISTENCIA. El ciclo decide si procede acreditar;
    // toda notificacion queda registrada, se procese o no.
    if (result) {
      const format = query?.['data.id'] ? 'WEBHOOK' : query?.topic ? 'IPN' : 'UNKNOWN';
      const decision = await this.paymentCycle.evaluate(
        provider as PaymentProvider,
        result,
        format,
      );

      if (!decision.shouldCredit) {
        this.logger.info(`Ciclo ${result.externalId}: ${decision.outcome} — no procede acreditar`);
        return { received: true };
      }
    }

    if (result && result.status === 'COMPLETED') {
      // Extract UserId from Reference (DEP-UserId-Timestamp)
      // Referencia: DEP-<userId>-<timestamp>. userId es un UUID (con guiones), por lo que
      // no se puede usar split('-')[1]; se extrae todo entre "DEP-" y el "-<timestamp>" final.
      const refMatch = /^DEP-(.+)-\d+$/.exec(result.externalId);
      if (refMatch) {
        const userId = refMatch[1];
        // Extract amount from webhook metadata — avoids re-calling the provider API
        // PT-076: `result.amount` (normalizado por el proveedor) tiene prioridad. Se antepone
        // en lugar de sustituir la cadena histórica: para MP y Stripe es undefined, de modo que
        // su comportamiento queda idéntico.
        // MP: transaction_amount, PayPal IPN (heredado): mc_gross, Stripe: amount_total (cents)
        const rawAmount =
          result.amount ??
          result.metadata?.transaction_amount ??
          result.metadata?.mc_gross ??
          (result.metadata?.amountTotal ? Number(result.metadata.amountTotal) / 100 : 0);
        const amount = Number(rawAmount) || 0;

        if (amount > 0) {
          await this.creditOnce(provider, result, userId, amount);
        } else {
          this.logger.error(`Cannot credit wallet: amount not found in webhook metadata`, {
            data: result as unknown as Record<string, unknown>,
          });
        }
      }
    }

    return { received: true };
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
    // PT-076: derivado de la configuración real. Antes MERCADO_PAGO y PAYPAL estaban
    // fijos, de modo que PayPal se ofrecía en la UI aunque reventase al usarse.
    const providers: Array<[PaymentProviderEnum, boolean]> = [
      [PaymentProviderEnum.MERCADO_PAGO, this.mercadopagoProvider.checkStatus()],
      [PaymentProviderEnum.PAYPAL, this.paypalProvider.checkStatus()],
      [PaymentProviderEnum.STRIPE, this.stripeProvider.checkStatus()],
      [PaymentProviderEnum.HEY_BANCO, this.heyBancoProvider.checkStatus()],
    ];

    return providers.filter(([, enabled]) => enabled).map(([name]) => name);
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

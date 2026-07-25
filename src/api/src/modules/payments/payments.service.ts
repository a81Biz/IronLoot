import { Injectable, BadRequestException } from '@nestjs/common';
import { UserPaymentMethod } from '@prisma/client';
import { isValidClabe } from '../wallet/clabe.util';
import { StripeProvider } from './providers/stripe.provider';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { PaypalProvider } from './providers/paypal.provider';
import { HeyBancoProvider } from './providers/heybanco.provider';
import { PaymentProviderEnum } from './interfaces';
import { WalletService } from '../wallet/wallet.service';
import { PrismaService } from '../../database/prisma.service';
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
      result = await this.paypalProvider.handleWebhook(payload);
    } else if (provider === 'HEY_BANCO') {
      result = await this.heyBancoProvider.handleWebhook(payload, headers);
    }

    if (result && result.status === 'COMPLETED') {
      // Extract UserId from Reference (DEP-UserId-Timestamp)
      // Referencia: DEP-<userId>-<timestamp>. userId es un UUID (con guiones), por lo que
      // no se puede usar split('-')[1]; se extrae todo entre "DEP-" y el "-<timestamp>" final.
      const refMatch = /^DEP-(.+)-\d+$/.exec(result.externalId);
      if (refMatch) {
        const userId = refMatch[1];
        // Extract amount from webhook metadata — avoids re-calling the provider API
        // MP: transaction_amount, PayPal IPN: mc_gross, Stripe: amount_total (cents)
        const rawAmount =
          result.metadata?.transaction_amount ??
          result.metadata?.mc_gross ??
          (result.metadata?.amountTotal ? Number(result.metadata.amountTotal) / 100 : 0);
        const amount = Number(rawAmount) || 0;

        if (amount > 0) {
          try {
            this.logger.info(`Crediting wallet for user ${userId} amount ${amount}`);
            await this.walletService.deposit(userId, amount, result.externalId, 'DEPOSIT');
          } catch (e) {
            this.logger.error(`Failed to credit wallet for ${result.externalId}`, {
              error: e as Error,
            });
          }
        } else {
          this.logger.error(`Cannot credit wallet: amount not found in webhook metadata`, {
            data: result as unknown as Record<string, unknown>,
          });
        }
      }
    }

    return { received: true };
  }

  getAvailableProviders(): string[] {
    const providers: string[] = [PaymentProviderEnum.MERCADO_PAGO, PaymentProviderEnum.PAYPAL];
    if (this.stripeProvider.checkStatus()) providers.push(PaymentProviderEnum.STRIPE);
    if (this.heyBancoProvider.checkStatus()) providers.push(PaymentProviderEnum.HEY_BANCO);
    return providers;
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

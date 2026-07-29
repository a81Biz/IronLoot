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
import { PaymentTraceService } from './payment-trace.service';
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
    private readonly trace: PaymentTraceService,
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
    // PT-142 — Entre la guarda y el `create` cabe otra petición: `@@unique([userId, referenceId])`
    // hace que la perdedora reciba `P2002`, y el vendedor vería un 500 al registrar su CLABE
    // —justo en el flujo del que depende cobrar— en vez del 400 que le corresponde.
    try {
      return await this.crearMetodoClabe(userId, dto);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new BadRequestException('Esta CLABE ya está registrada');
      }
      throw error;
    }
  }

  private crearMetodoClabe(
    userId: string,
    dto: { bankName?: string; clabe: string; holderName: string; alias?: string },
  ) {
    return this.prisma.userPaymentMethod.create({
      data: {
        userId,
        type: 'CLABE',
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

  /**
   * PT-092 — Registra una cuenta de PayPal como destino de cobro.
   *
   * **Solo se admite una.** La asimetría con la CLABE es deliberada: una cuenta de PayPal se
   * identifica por un correo y una persona tiene el suyo; tener dos registradas no resuelve
   * ningún caso real y multiplica la posibilidad de equivocarse al elegir destino. En cambio es
   * normal tener cuentas en varios bancos, o una personal y otra de la actividad.
   *
   * Nace **sin verificar**, como todas: el destino de un retiro es un hecho comprobado, no una
   * afirmación del usuario (PT-092, cierre de TD-003).
   */
  async addPaypalAccount(
    userId: string,
    dto: { paypalEmail: string; alias?: string },
  ): Promise<UserPaymentMethod> {
    const correo = String(dto.paypalEmail ?? '')
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
      throw new BadRequestException('Correo de PayPal inválido');
    }

    const existentes = await this.prisma.userPaymentMethod.findMany({
      where: { userId, type: 'PAYPAL', isActive: true },
    });
    if (existentes.length > 0) {
      // Se dice CUAL es, para que se pueda quitar sin tener que buscarla.
      throw new BadRequestException(
        `Ya tienes una cuenta de PayPal registrada (${existentes[0].paypalEmail}). ` +
          'Elimínala primero si quieres usar otra.',
      );
    }

    return this.prisma.userPaymentMethod.create({
      data: {
        userId,
        type: 'PAYPAL',
        referenceId: correo, // el correo identifica el método
        paypalEmail: correo,
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

    // PT-086 — Primer eslabon de la traza: que pidio el usuario y a que pasarela.
    await this.trace.record({
      reference: orderId,
      provider: provider as string,
      step: 'DEPOSIT_REQUESTED',
      direction: 'INBOUND',
      outcome: 'OK',
      data: { userId, email, amount, currency, provider: providerStr, description },
    });

    // PT-080 — El nucleo no conoce pasarelas: el registro resuelve el adaptador.
    const adapter = this.registry.resolve(provider);
    if (adapter && adapter.checkStatus()) {
      const created = await adapter.createPayment(orderId, amount, currency, description, email);

      // PT-087 — El id que devuelve la pasarela es lo único con lo que algunas pueden
      // localizar el pago después: PayPal no busca por `custom_id`. Sin esto, su vía
      // garantizada no tiene por dónde empezar.
      await this.paymentCycle.attachProviderRef(orderId, created.externalId);

      return created;
    }

    throw new BadRequestException('Unsupported or invalid payment provider');
  }
  /**
   * PT-133 — `verifyPayment()` y `createCheckoutSession()` RETIRADOS.
   *
   * Sus unicos llamantes eran los manejadores legados `POST /wallet/deposit` y
   * `POST /payments/checkout`, que ningun cliente invocaba. Al retirar los endpoints se quedaron
   * sin uso.
   *
   * `verifyPayment` era ademas donde vivia H-018: un `referenceId` desconocido hacia que el
   * adaptador de PayPal lanzara un 404 sin captura y saliera como 500. Retirar el camino cierra el
   * hallazgo de raiz, que es mejor que traducir el error de una puerta que sobra.
   *
   * La verificacion real de un pago vive en el ciclo (PT-080/PT-087): la notificacion o la via
   * garantizada, con `findPayment(ctx)` por adaptador.
   */

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

    try {
      await this.creditFromResult(provider, result);
    } catch (e) {
      // PT-087 (F-09) — El ciclo ya se marcó SETTLED al confirmar con la pasarela, pero el
      // dinero no ha llegado al usuario. Dejarlo así sería lo peor de los dos mundos: el
      // sistema afirmando que el pago está resuelto mientras el saldo no existe, y sin que la
      // vía garantizada vuelva a mirarlo nunca (solo recoge ciclos en REQUESTED).
      //
      // Se reabre para reintento. Es seguro: `creditOnce` ya liberó la reserva de
      // deduplicación, así que el reintento acredita una sola vez.
      if (decision.cycleId) {
        await this.paymentCycle.reopenForRetry(decision.cycleId);
      }
      throw e;
    }

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
      await this.creditWallet(userId, amount, result.externalId, provider).catch(() => undefined);
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
      await this.creditWallet(userId, amount, result.externalId, provider);
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

  private async creditWallet(
    userId: string,
    amount: number,
    referenceId: string,
    provider: string,
  ): Promise<void> {
    try {
      this.logger.info(`Crediting wallet for user ${userId} amount ${amount}`);
      const result = await this.walletService.deposit(userId, amount, referenceId, 'DEPOSIT');

      // PT-086 — La acreditacion, con saldo antes y despues y el asiento generado. Los saldos
      // salen del propio asiento del ledger, que ya los registra: no se consulta la BD de nuevo.
      const ledger = result?.ledger;
      await this.trace.record({
        reference: referenceId,
        // PT-087 (F-11) — Antes iba 'MERCADO_PAGO' en duro: la traza de una acreditacion
        // por PayPal mentia sobre la pasarela, que es justo el dato que sostiene una disputa.
        provider,
        step: 'WALLET_CREDITED',
        direction: 'INTERNAL',
        outcome: 'OK',
        data: {
          userId,
          amount,
          saldoAntes: ledger?.balanceBefore ?? null,
          saldoDespues: ledger?.balanceAfter ?? null,
          ledgerId: ledger?.id ?? null,
        },
      });
    } catch (e) {
      this.logger.error(`Failed to credit wallet for ${referenceId}`, { error: e as Error });
      // PT-087 (F-09) — Que la acreditacion falle no puede pasar en silencio: es el unico
      // punto donde el dinero llega al usuario.
      await this.trace.record({
        reference: referenceId,
        provider,
        step: 'WALLET_CREDITED',
        direction: 'INTERNAL',
        outcome: 'ERROR',
        detail: (e as Error).message,
        data: { userId, amount },
      });
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

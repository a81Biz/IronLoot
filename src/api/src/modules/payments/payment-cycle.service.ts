import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StructuredLogger } from '../../common/observability';
import { WebhookResult } from './interfaces';

/** Moneda única de la plataforma (ADR-007). Un ciclo en otra moneda es una anomalía. */
const PLATFORM_CURRENCY = 'MXN';

/**
 * Retroceso exponencial de la vía garantizada. Las tarjetas resuelven en segundos —de ahí la
 * primera consulta al minuto— y el efectivo o SPEI tardan días, donde insistir solo carga la
 * API de la pasarela. Máximo ~10 consultas por ciclo.
 */
const CHECK_BACKOFF_MS = [60_000, 300_000, 900_000, 3_600_000, 21_600_000];
const CHECK_BACKOFF_TAIL_MS = 43_200_000;

/** Referencia de depósito: DEP-<userId>-<timestamp>. El userId es un UUID, con guiones. */
const DEPOSIT_REFERENCE = /^DEP-(.+)-\d+$/;

export type CycleOutcome =
  | 'PROCESSED'
  | 'DUPLICATE'
  | 'CANCELLED'
  | 'REJECTED'
  | 'ANOMALY'
  | 'ORPHAN';

export interface CycleDecision {
  /** Si el llamante debe acreditar el wallet. */
  shouldCredit: boolean;
  outcome: CycleOutcome;
  cycleId: string | null;
}

export interface PendingCycle {
  id: string;
  provider: PaymentProvider;
  reference: string;
  requestedAt: Date;
  checkCount: number;
  /** PT-087 — Id que devolvió la pasarela al crear el cobro. Nulo en ciclos anteriores. */
  providerRef?: string | null;
}

export interface OpenCycleInput {
  provider: PaymentProvider;
  reference: string;
  userId: string;
  amount: number;
  currency?: string;
}

/**
 * PT-080 — Ciclo de vida de un pago en tres fases.
 *
 *   SOLICITUD (al pedir el pago) → CONFIRMACIÓN (respuesta de la pasarela) → PERSISTENCIA (cierre)
 *
 * Las tres deben coincidir en usuario, importe y moneda. Si algo difiere, el ciclo queda en
 * `ANOMALY` y **no se acredita**.
 *
 * Solo se procesa la **primera** respuesta, sea positiva o negativa. Las posteriores se
 * registran como `DUPLICATE` (mismo pago) o `CANCELLED` (pago distinto), sin efecto sobre el
 * resultado ya establecido.
 *
 * Este servicio **no acredita**: decide. La acreditación y su barrera de idempotencia siguen
 * en `PaymentsService`.
 */
@Injectable()
export class PaymentCycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
  ) {}

  /** Fase 1 — SOLICITUD. Se abre al pedir el pago, no al recibir la notificación. */
  async open(input: OpenCycleInput): Promise<void> {
    await this.prisma.paymentCycle.create({
      data: {
        provider: input.provider,
        reference: input.reference,
        userId: input.userId,
        amount: input.amount,
        currency: input.currency ?? PLATFORM_CURRENCY,
        status: 'REQUESTED',
        // Primera comprobación de la vía garantizada.
        nextCheckAt: new Date(Date.now() + 60_000),
      },
    });
  }

  /**
   * PT-087 (F-09) — Devuelve un ciclo ya cerrado al estado reintentable.
   *
   * `evaluate()` marca SETTLED en cuanto la pasarela confirma, **antes** de que el dinero
   * llegue al monedero. Si acreditar falla después, el ciclo se queda afirmando que el pago
   * está resuelto y la vía garantizada no vuelve a mirarlo nunca, porque solo recoge ciclos
   * en REQUESTED. Eso es dinero cobrado y perdido con el sistema declarando éxito.
   *
   * Reabrirlo es seguro: la reserva de deduplicación se libera en el mismo camino de error,
   * de modo que el reintento acredita una sola vez. Y `settledAt` se conserva a propósito:
   * la traza debe recordar que hubo un cierre prematuro.
   */
  async reopenForRetry(cycleId: string): Promise<void> {
    await this.prisma.paymentCycle.update({
      where: { id: cycleId },
      data: { status: 'REQUESTED', nextCheckAt: new Date(Date.now() + 60_000) },
    });
    this.logger.warn(`Ciclo ${cycleId} reabierto: confirmado por la pasarela pero sin acreditar`);
  }

  /**
   * PT-087 — Guarda el identificador que la pasarela devolvió al crear el cobro.
   *
   * Se llama **después** de `createPayment`, porque hasta entonces no existe: el ciclo nace
   * antes de hablar con la pasarela, a propósito (una solicitud abierta sin confirmación es la
   * señal de que puede haber dinero cobrado sin acreditar).
   *
   * **No lanza.** Si esto falla, el usuario ya tiene su enlace de pago y el cobro puede
   * ocurrir: tumbar la solicitud por no poder anotar un identificador sería el peor canje
   * posible. El coste de fallar es perder la vía garantizada para *ese* ciclo, que entonces
   * expira a las 72 h como haría sin PT-087.
   */
  async attachProviderRef(reference: string, providerRef: string | undefined): Promise<void> {
    if (!providerRef) return;

    try {
      await this.prisma.paymentCycle.updateMany({
        where: { reference },
        data: { providerRef },
      });
    } catch (error) {
      this.logger.error(`No se pudo anotar el id de pasarela para ${reference}`, {
        error: error as Error,
      });
    }
  }

  /**
   * Fases 2 y 3 — CONFIRMACIÓN y PERSISTENCIA.
   * Devuelve si procede acreditar; nunca lanza por duplicado (la excepción de dominio está
   * mapeada a 409 y provocaría reintentos indefinidos justo sobre el caso más frecuente).
   */
  async evaluate(
    provider: PaymentProvider,
    result: WebhookResult,
    format: string,
  ): Promise<CycleDecision> {
    const cycle = await this.prisma.paymentCycle.findUnique({
      where: { reference: result.externalId },
    });

    if (!cycle) {
      await this.record(
        null,
        provider,
        result,
        format,
        'ORPHAN',
        'Confirmación sin solicitud previa',
      );
      this.logger.error(`Confirmación sin solicitud para ${result.externalId}`);
      return { shouldCredit: false, outcome: 'ORPHAN', cycleId: null };
    }

    // ── Primera respuesta gana: el ciclo ya está cerrado ──
    if (cycle.status !== 'REQUESTED' && cycle.status !== 'CONFIRMED') {
      if (cycle.canonicalPaymentId === result.paymentId) {
        await this.record(cycle.id, provider, result, format, 'DUPLICATE');
        return { shouldCredit: false, outcome: 'DUPLICATE', cycleId: cycle.id };
      }

      // Un pago DISTINTO sobre una referencia ya cerrada significa que la pasarela cobró más
      // de una vez sobre una sola solicitud. Probablemente haya que devolver dinero.
      const reason = `Cobro distinto (${result.paymentId}) sobre una referencia ya cerrada con ${cycle.canonicalPaymentId}`;
      await this.flagAnomaly(cycle.id, reason);
      await this.record(cycle.id, provider, result, format, 'CANCELLED', reason);
      await this.raiseRefund(cycle, result, reason);
      this.logger.error(reason);
      return { shouldCredit: false, outcome: 'CANCELLED', cycleId: cycle.id };
    }

    // ── Respuesta negativa: también cierra ──
    if (result.status !== 'COMPLETED') {
      await this.prisma.paymentCycle.update({
        where: { id: cycle.id },
        data: {
          status: 'FAILED',
          respondedAt: new Date(),
          canonicalPaymentId: result.paymentId,
          responseSnapshot: result as unknown as object,
          nextCheckAt: null,
        },
      });
      await this.record(cycle.id, provider, result, format, 'REJECTED');
      await this.writePaymentRow(cycle, provider, result, 'FAILED');
      return { shouldCredit: false, outcome: 'REJECTED', cycleId: cycle.id };
    }

    // ── Invariante de las tres fases ──
    const mismatch = this.checkInvariant(cycle, result);
    if (mismatch) {
      await this.flagAnomaly(cycle.id, mismatch);
      await this.record(cycle.id, provider, result, format, 'ANOMALY', mismatch);
      this.logger.error(`Anomalía en el ciclo ${cycle.reference}: ${mismatch}`);
      return { shouldCredit: false, outcome: 'ANOMALY', cycleId: cycle.id };
    }

    // ── Coherente: se cierra y procede acreditar ──
    const now = new Date();
    await this.prisma.paymentCycle.update({
      where: { id: cycle.id },
      data: {
        status: 'SETTLED',
        canonicalPaymentId: result.paymentId,
        responseSnapshot: result as unknown as object,
        respondedAt: now,
        settledAt: now,
        nextCheckAt: null,
      },
    });
    await this.record(cycle.id, provider, result, format, 'PROCESSED');
    await this.writePaymentRow(cycle, provider, result, 'COMPLETED');

    return { shouldCredit: true, outcome: 'PROCESSED', cycleId: cycle.id };
  }

  /** Ciclos abiertos cuya próxima consulta ya venció. */
  async dueForCheck(limit = 50): Promise<PendingCycle[]> {
    return this.prisma.paymentCycle.findMany({
      where: { status: 'REQUESTED', nextCheckAt: { lte: new Date() } },
      orderBy: { nextCheckAt: 'asc' },
      take: limit,
    }) as unknown as Promise<PendingCycle[]>;
  }

  /**
   * Una solicitud que supera `PAYMENT_EXPIRATION_HOURS` sin resolverse se da por no resuelta.
   * El valor (72 h) ya estaba configurado en el proyecto y no se usaba; cubre además los pagos
   * en efectivo y SPEI, que tardan días.
   */
  isExpired(cycle: { requestedAt: Date }): boolean {
    const hours = Number(process.env.PAYMENT_EXPIRATION_HOURS || '72');
    return Date.now() - new Date(cycle.requestedAt).getTime() > hours * 3_600_000;
  }

  async expire(cycleId: string): Promise<void> {
    await this.prisma.paymentCycle.update({
      where: { id: cycleId },
      data: {
        status: 'EXPIRED',
        nextCheckAt: null,
        anomalyReason: 'Sin resolución dentro del plazo; se asume no resuelto',
      },
    });
  }

  /** Reprograma la siguiente consulta según el retroceso exponencial. */
  async scheduleNextCheck(cycle: { id: string; checkCount: number }): Promise<void> {
    const delay = CHECK_BACKOFF_MS[cycle.checkCount] ?? CHECK_BACKOFF_TAIL_MS;
    await this.prisma.paymentCycle.update({
      where: { id: cycle.id },
      data: { checkCount: { increment: 1 }, nextCheckAt: new Date(Date.now() + delay) },
    });
  }

  /**
   * Compara la SOLICITUD con la CONFIRMACIÓN. Devuelve el motivo del desajuste, o null.
   * Cualquier diferencia invalida la acreditación: es dinero.
   */
  private checkInvariant(
    cycle: { userId: string; amount: unknown; currency: string; reference: string },
    result: WebhookResult,
  ): string | null {
    if (cycle.currency !== PLATFORM_CURRENCY) {
      return `Moneda del ciclo (${cycle.currency}) distinta de la moneda de la plataforma (${PLATFORM_CURRENCY})`;
    }

    if (result.amount != null && Number(cycle.amount) !== Number(result.amount)) {
      return `Importe confirmado (${result.amount}) distinto del solicitado (${String(cycle.amount)})`;
    }

    const match = DEPOSIT_REFERENCE.exec(cycle.reference);
    if (match && match[1] !== cycle.userId) {
      return `El usuario de la referencia (${match[1]}) no coincide con el de la solicitud (${cycle.userId})`;
    }

    return null;
  }

  /**
   * PT-085 — Registro contable del pago.
   *
   * `Payment.orderId` era obligatorio con clave foránea a `Order` y un depósito no tiene orden,
   * de modo que **nadie escribía nunca esta tabla**. El panel financiero del admin la consulta
   * en seis sitios y mostraba ceros. Desde PT-085 `orderId` es opcional y el ciclo escribe aquí.
   *
   * Es un registro contable, no la fuente de verdad del dinero: si falla, la acreditación sigue
   * adelante. El saldo del usuario no puede depender de un apunte de reporting.
   */
  private async writePaymentRow(
    cycle: { reference: string; currency: string },
    provider: PaymentProvider,
    result: WebhookResult,
    status: 'COMPLETED' | 'FAILED',
  ): Promise<void> {
    const fila = {
      provider,
      status,
      amount: result.amount ?? 0,
      currency: cycle.currency,
      externalId: result.paymentId,
      reference: cycle.reference,
      metadata: (result.metadata ?? {}) as object,
    };

    try {
      // PT-087 (F-12) — Idempotente por referencia. Un ciclo reabierto tras un fallo de
      // acreditación (F-09) vuelve a pasar por aquí, y con `create` dejaba dos asientos del
      // mismo cobro: el ledger decía 321.50 y el panel financiero 643.00. La referencia
      // identifica la solicitud, y una solicitud es un pago.
      await this.prisma.payment.upsert({
        where: { reference: cycle.reference },
        create: fila,
        update: { status: fila.status, externalId: fila.externalId, metadata: fila.metadata },
      });
    } catch (e) {
      this.logger.error(`No se pudo registrar el pago ${result.paymentId}`, { error: e as Error });
    }
  }

  /**
   * PT-085 — Un cobro distinto sobre una referencia ya cerrada significa que la pasarela cobró
   * más de una vez. Se crea la solicitud de reembolso que PT-080 quería y no pudo, porque
   * `RefundRequest.orderId` era obligatorio. La ejecuta el admin (ADR-022).
   */
  private async raiseRefund(
    cycle: { reference: string; currency: string },
    result: WebhookResult,
    reason: string,
  ): Promise<void> {
    try {
      await this.prisma.refundRequest.create({
        data: {
          amount: result.amount ?? 0,
          currency: cycle.currency,
          reason,
          status: 'PENDING_REFUND',
          initiatedBy: 'system:payment-cycle',
          paymentReference: cycle.reference,
        },
      });
    } catch (e) {
      this.logger.error(`No se pudo crear la solicitud de reembolso para ${cycle.reference}`, {
        error: e as Error,
      });
    }
  }

  /** Marca el ciclo para revisión. La tabla del ciclo **es** la cola del admin. */
  private async flagAnomaly(cycleId: string, reason: string): Promise<void> {
    await this.prisma.paymentCycle.update({
      where: { id: cycleId },
      data: {
        status: 'ANOMALY',
        anomalyReason: reason,
        respondedAt: new Date(),
        nextCheckAt: null,
      },
    });
  }

  /** Toda notificación queda registrada, se procese o no. */
  private async record(
    cycleId: string | null,
    provider: PaymentProvider,
    result: WebhookResult,
    format: string,
    outcome: CycleOutcome,
    detail?: string,
  ): Promise<void> {
    await this.prisma.paymentCycleEvent.create({
      data: {
        cycleId,
        provider,
        externalId: result.paymentId ?? '',
        // PT-086 — La decision del ciclo forma parte de la traza y usa su mismo vocabulario.
        reference: result.externalId ?? null,
        step: 'CYCLE_DECISION',
        direction: 'INTERNAL',
        format,
        outcome,
        detail: detail ?? null,
        payload: result as unknown as object,
      },
    });
  }
}

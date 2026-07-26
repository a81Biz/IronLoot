import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StructuredLogger } from '../../common/observability';
import { WebhookResult } from './interfaces';

/** Moneda única de la plataforma (ADR-007). Un ciclo en otra moneda es una anomalía. */
const PLATFORM_CURRENCY = 'MXN';

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

    return { shouldCredit: true, outcome: 'PROCESSED', cycleId: cycle.id };
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
        format,
        outcome,
        detail: detail ?? null,
        payload: result as unknown as object,
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StructuredLogger } from '../../common/observability';
import { PaymentCycleService, PendingCycle } from './payment-cycle.service';
import { PaymentsService } from './payments.service';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { PaymentTraceService } from './payment-trace.service';

/**
 * PT-080 — Vía garantizada.
 *
 * El webhook es la vía rápida. Ésta es la que impide perder dinero: consulta a la pasarela
 * por la referencia de las solicitudes que siguen abiertas, de modo que un pago cobrado cuya
 * notificación nunca llegó se acredita igualmente.
 *
 * Es exactamente lo que habría evitado que se perdieran 180 MXN reales el 2026-07-26, cuando
 * un pago aprobado en Mercado Pago quedó sin acreditar porque ninguna notificación alcanzó la
 * API. También elimina la dependencia de un túnel público en desarrollo.
 *
 * Al vencer `PAYMENT_EXPIRATION_HOURS` sin resolución, el ciclo expira: se asume no resuelto
 * y no acredita.
 *
 * Hoy solo cubre Mercado Pago, que es el único proveedor verificable de punta a punta. La
 * Fase C lo generaliza a través del registro de proveedores.
 */
@Injectable()
export class PaymentReconciliationService {
  constructor(
    private readonly cycles: PaymentCycleService,
    private readonly payments: PaymentsService,
    private readonly mercadopago: MercadoPagoProvider,
    private readonly logger: StructuredLogger,
    private readonly trace: PaymentTraceService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async reconcilePending(): Promise<void> {
    const pending = await this.cycles.dueForCheck(50);
    if (pending.length === 0) return;

    this.logger.info(`Reconciliación: ${pending.length} solicitudes abiertas por comprobar`);

    for (const cycle of pending) {
      // Un fallo con una solicitud no puede impedir que se revisen las demás.
      await this.reconcileOne(cycle).catch((e) =>
        this.logger.error(`Reconciliación fallida para ${cycle.reference}`, {
          error: e as Error,
        }),
      );
    }
  }

  private async reconcileOne(cycle: PendingCycle): Promise<void> {
    if (this.cycles.isExpired(cycle)) {
      this.logger.warn(
        `Solicitud ${cycle.reference} vencida sin resolución — se asume no resuelta`,
      );
      await this.trace.record({
        reference: cycle.reference,
        provider: cycle.provider,
        step: 'CYCLE_EXPIRED',
        direction: 'INTERNAL',
        outcome: 'ERROR',
        cycleId: cycle.id,
        detail: 'Sin resolucion dentro del plazo; se asume no resuelta',
        data: { requestedAt: cycle.requestedAt, checkCount: cycle.checkCount },
      });
      await this.cycles.expire(cycle.id);
      return;
    }

    const result = await this.lookup(cycle);

    // PT-086 — Cada intento de la via garantizada queda registrado, encuentre o no el pago.
    await this.trace.record({
      reference: cycle.reference,
      provider: cycle.provider,
      step: 'POLL_ATTEMPT',
      direction: 'OUTBOUND',
      outcome: result ? 'OK' : 'ERROR',
      format: 'POLL',
      cycleId: cycle.id,
      externalId: result?.paymentId,
      detail: result ? 'pago encontrado' : 'la pasarela aun no tiene pago',
      data: { intento: cycle.checkCount + 1, resultado: result ?? null },
    });

    if (!result) {
      await this.cycles.scheduleNextCheck(cycle);
      return;
    }

    this.logger.info(
      `Reconciliación: pago ${result.paymentId} encontrado para ${cycle.reference} sin notificación previa`,
    );
    await this.payments.applyProviderResult(cycle.provider, result, 'POLL');
  }

  private async lookup(cycle: PendingCycle) {
    if (cycle.provider === 'MERCADO_PAGO') {
      return this.mercadopago.findPaymentByReference(cycle.reference);
    }
    // Los demás proveedores se incorporan con el registro de la Fase C.
    return null;
  }
}

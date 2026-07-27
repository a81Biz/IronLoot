import { PaymentCycleService } from '../../../src/modules/payments/payment-cycle.service';

/**
 * PT-087 — F-12: el registro contable no puede duplicarse al reintentar.
 *
 * Encontrado el 2026-07-27 al verificar la corrección de F-09. Reabrir un ciclo cuya
 * acreditación falló hace que `evaluate()` vuelva a pasar por el cierre, y `payments`
 * recibía una segunda fila del mismo cobro. El ledger y el saldo quedaban correctos —321.50
 * una sola vez— pero el panel financiero sumaba 643.00 de un solo pago.
 *
 * Un asiento contable duplicado no es un detalle estético: es la cifra que el administrador
 * usa para cuadrar con la pasarela.
 */
describe('Registro contable idempotente (PT-087)', () => {
  let service: PaymentCycleService;
  let filas: Array<Record<string, unknown>>;
  let cicloActual: Record<string, unknown>;

  const REF = 'DEP-db73d689-0ab1-4ed2-93c8-11b83e7ade6a-1785117585473';

  const resultado = {
    paymentId: 'CAP-9',
    externalId: REF,
    status: 'COMPLETED' as const,
    amount: 321.5,
  };

  beforeEach(() => {
    filas = [];
    cicloActual = {
      id: 'c-1',
      reference: REF,
      provider: 'PAYPAL',
      userId: 'db73d689-0ab1-4ed2-93c8-11b83e7ade6a',
      amount: 321.5,
      currency: 'MXN',
      status: 'REQUESTED',
      canonicalPaymentId: null,
    };

    // Prisma en memoria, solo lo que `evaluate` toca.
    const prisma = {
      paymentCycle: {
        findUnique: async () => cicloActual,
        update: async ({ data }: { data: Record<string, unknown> }) => {
          Object.assign(cicloActual, data);
          return cicloActual;
        },
      },
      paymentCycleEvent: { create: async () => ({}) },
      payment: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          filas.push(data);
          return data;
        },
        upsert: async ({
          where,
          create,
          update,
        }: {
          where: { reference: string };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          const existente = filas.find((f) => f.reference === where.reference);
          if (existente) {
            Object.assign(existente, update);
            return existente;
          }
          filas.push(create);
          return create;
        },
      },
    };

    service = new PaymentCycleService(
      prisma as never,
      {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        child: jest.fn().mockReturnThis(),
      } as never,
    );
  });

  it('R-01: un cierre escribe una fila en payments', async () => {
    await service.evaluate('PAYPAL' as never, resultado, 'POLL');

    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ reference: REF, status: 'COMPLETED' });
  });

  it('R-02: reabrir y volver a cerrar NO duplica el asiento', async () => {
    await service.evaluate('PAYPAL' as never, resultado, 'POLL');

    // Acreditar falló: el ciclo se reabre (F-09) y la vía garantizada vuelve a encontrarlo.
    cicloActual.status = 'REQUESTED';

    await service.evaluate('PAYPAL' as never, resultado, 'POLL');

    expect(filas).toHaveLength(1);
  });

  it('R-03: el importe registrado sigue siendo el del cobro, no su suma', async () => {
    await service.evaluate('PAYPAL' as never, resultado, 'POLL');
    cicloActual.status = 'REQUESTED';
    await service.evaluate('PAYPAL' as never, resultado, 'POLL');

    expect(Number(filas[0].amount)).toBe(321.5);
  });
});

import { NotFoundException } from '@nestjs/common';
import { PaymentCycleService } from '../../../src/modules/payments/payment-cycle.service';

/**
 * PT-088 — Estado del depósito para la página de retorno.
 *
 * La pasarela devuelve al usuario con un `status` en la URL, y ese parámetro **lo escribe el
 * navegador**: cualquiera puede cambiar `status=failure` por `status=success`. La página de
 * retorno no puede creérselo. Este es el endpoint que le dice la verdad.
 *
 * Y la verdad es de su dueño: un usuario no puede consultar el depósito de otro.
 */
describe('Estado del depósito (PT-088)', () => {
  const REF = 'DEP-11111111-1111-1111-1111-111111111111-1785118693342';
  const DUENO = '11111111-1111-1111-1111-111111111111';
  const OTRO = '22222222-2222-2222-2222-222222222222';

  let service: PaymentCycleService;
  let findUnique: jest.Mock;

  const ciclo = (over: Record<string, unknown> = {}) => ({
    id: 'c-1',
    reference: REF,
    provider: 'PAYPAL',
    userId: DUENO,
    amount: '321.50',
    currency: 'MXN',
    status: 'SETTLED',
    requestedAt: new Date('2026-07-27T02:00:00Z'),
    settledAt: new Date('2026-07-27T02:01:30Z'),
    ...over,
  });

  beforeEach(() => {
    findUnique = jest.fn().mockResolvedValue(ciclo());
    service = new PaymentCycleService(
      { paymentCycle: { findUnique } } as never,
      {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        child: jest.fn().mockReturnThis(),
      } as never,
    );
  });

  it('S-01: el dueño ve el estado de su depósito', async () => {
    const r = await service.statusFor(REF, DUENO);

    expect(r).toMatchObject({
      reference: REF,
      provider: 'PAYPAL',
      status: 'SETTLED',
      settled: true,
    });
    expect(Number(r.amount)).toBe(321.5);
  });

  it('S-02: otro usuario NO puede consultarlo — se comporta como inexistente', async () => {
    // Responder «no es tuyo» confirmaría que existe. Se responde lo mismo que si no existiera.
    await expect(service.statusFor(REF, OTRO)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('S-03: una referencia inexistente da 404', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.statusFor(REF, DUENO)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('S-04: un depósito aún abierto se informa como pendiente, no como fallido', async () => {
    // Efectivo y SPEI tardan horas. Decirle «falló» a quien acaba de pagar en un OXXO sería
    // mentirle y provocar un segundo pago.
    findUnique.mockResolvedValue(ciclo({ status: 'REQUESTED', settledAt: null }));

    const r = await service.statusFor(REF, DUENO);

    expect(r.settled).toBe(false);
    expect(r.pending).toBe(true);
    expect(r.failed).toBe(false);
  });

  it('S-05: un depósito rechazado se informa como fallido, no como pendiente', async () => {
    findUnique.mockResolvedValue(ciclo({ status: 'FAILED', settledAt: null }));

    const r = await service.statusFor(REF, DUENO);

    expect(r.failed).toBe(true);
    expect(r.pending).toBe(false);
  });

  it('S-06: uno vencido es fallido: se asumió no resuelto', async () => {
    findUnique.mockResolvedValue(ciclo({ status: 'EXPIRED', settledAt: null }));

    const r = await service.statusFor(REF, DUENO);

    expect(r.failed).toBe(true);
  });

  it('S-07: no expone datos internos del ciclo', async () => {
    const r = await service.statusFor(REF, DUENO);

    expect(r).not.toHaveProperty('id');
    expect(r).not.toHaveProperty('userId');
    expect(r).not.toHaveProperty('responseSnapshot');
  });
});

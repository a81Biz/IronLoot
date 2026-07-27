import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountVerificationService } from '../../../src/modules/wallet/account-verification.service';

/**
 * PT-092 — Verificar que la cuenta de cobro pertenece al vendedor.
 *
 * Cierra TD-003: hoy `isVerified` nace `false`, **nadie lo pone nunca a `true` y nadie lo
 * comprueba**, de modo que se retira dinero a una CLABE que nadie ha confirmado. El dígito
 * verificador atrapa erratas de tecleo, no la titularidad: una CLABE ajena válida pasa igual.
 *
 * El mecanismo es el mismo para los tres destinos: **el token viaja con el movimiento de dinero y
 * solo lo ve quien tiene acceso a la cuenta**. Cambia por dónde viaja.
 */
describe('AccountVerificationService (PT-092)', () => {
  const USUARIO = '11111111-1111-1111-1111-111111111111';
  const OTRO = '22222222-2222-2222-2222-222222222222';
  const METODO = '33333333-3333-3333-3333-333333333333';

  let service: AccountVerificationService;
  let metodoFind: jest.Mock;
  let verifCreate: jest.Mock;
  let verifFind: jest.Mock;
  let verifUpdate: jest.Mock;
  let metodoUpdate: jest.Mock;
  let saldo: jest.Mock;
  let trace: jest.Mock;

  const metodo = (over: Record<string, unknown> = {}) => ({
    id: METODO,
    userId: USUARIO,
    type: 'CLABE',
    clabe: '012180012345678903',
    isVerified: false,
    isActive: true,
    ...over,
  });

  const verificacion = (over: Record<string, unknown> = {}) => ({
    id: 'v-1',
    paymentMethodId: METODO,
    userId: USUARIO,
    token: 'ABC123',
    amount: 20,
    currency: 'MXN',
    status: 'SENT',
    attempts: 0,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600_000),
    ...over,
  });

  beforeEach(() => {
    metodoFind = jest.fn().mockResolvedValue(metodo());
    metodoUpdate = jest.fn().mockResolvedValue({});
    verifCreate = jest.fn().mockImplementation(({ data }) => ({ id: 'v-1', ...data }));

    // `findFirst` sirve a dos consultas distintas y no puede responder lo mismo a ambas:
    //   - `start()` pregunta si hay una verificacion EN CURSO (filtra por estado) -> por
    //     defecto no la hay, o todo intento de abrir una saldria por el camino idempotente.
    //   - `confirm()` pide la ultima verificacion del metodo (sin filtro de estado).
    // `enCurso` lo fuerza el test de idempotencia; `ultima` lo usan los de confirmacion.
    let enCurso: unknown = null;
    let ultima: unknown = verificacion();
    verifFind = jest.fn().mockImplementation(({ where }) => (where?.status ? enCurso : ultima));
    (verifFind as unknown as { conEnCurso: (v: unknown) => void }).conEnCurso = (v) => {
      enCurso = v;
    };
    (verifFind as unknown as { conUltima: (v: unknown) => void }).conUltima = (v) => {
      ultima = v;
    };
    verifUpdate = jest.fn().mockImplementation(({ data }) => ({ ...verificacion(), ...data }));
    saldo = jest.fn().mockResolvedValue({ available: 500 });
    trace = jest.fn().mockResolvedValue(undefined);

    service = new AccountVerificationService(
      {
        userPaymentMethod: { findUnique: metodoFind, update: metodoUpdate },
        accountVerification: {
          create: verifCreate,
          findFirst: verifFind,
          update: verifUpdate,
        },
      } as never,
      { getBalance: saldo } as never,
      { record: trace } as never,
      {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        child: jest.fn().mockReturnThis(),
      } as never,
    );
  });

  // ── El token ─────────────────────────────────────────────────────────

  it('W-01: el token no es predecible ni reutilizado', async () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const v = await service.start(USUARIO, METODO);
      tokens.add(v.token);
    }
    // 50 de 50 distintos. Con `Math.random` o un contador esto fallaría.
    expect(tokens.size).toBe(50);
  });

  it('W-02: el token es legible por una persona que lo copia de su banco', async () => {
    const v = await service.start(USUARIO, METODO);
    // Sin caracteres que se confundan al transcribir (0/O, 1/I/l).
    expect(v.token).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  // ── Los fondos salen del vendedor, no de la plataforma ───────────────

  it('W-03: sin saldo suficiente NO se inicia la verificación de una CLABE', async () => {
    // Si la plataforma pagara cada verificación, dar de alta cuentas en masa la drenaría.
    saldo.mockResolvedValue({ available: 5 });

    await expect(service.start(USUARIO, METODO)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('W-04: con saldo suficiente se reserva el importe de verificación', async () => {
    const v = await service.start(USUARIO, METODO);

    expect(Number(v.amount)).toBe(20);
    expect(v.currency).toBe('MXN');
  });

  // ── Propiedad ────────────────────────────────────────────────────────

  it('W-05: un método de otro usuario se comporta como inexistente', async () => {
    // Distinguir «no es tuyo» de «no existe» confirmaría que existe.
    await expect(service.start(OTRO, METODO)).rejects.toBeInstanceOf(NotFoundException);
  });

  // ── Declarar el token ────────────────────────────────────────────────

  it('W-06: el token correcto verifica el método', async () => {
    const r = await service.confirm(USUARIO, METODO, 'ABC123');

    expect(r.verified).toBe(true);
    expect(metodoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isVerified: true }) }),
    );
  });

  it('W-07: el token se compara sin distinguir mayúsculas ni espacios', async () => {
    // Quien lo copia de su banco lo escribirá como pueda.
    const r = await service.confirm(USUARIO, METODO, ' abc 123 ');
    expect(r.verified).toBe(true);
  });

  it('W-08: un token incorrecto no verifica y cuenta el intento', async () => {
    const r = await service.confirm(USUARIO, METODO, 'ZZZZZZ');

    expect(r.verified).toBe(false);
    expect(verifUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ attempts: 1 }) }),
    );
    expect(metodoUpdate).not.toHaveBeenCalled();
  });

  it('W-09: al quinto intento fallido el método queda bloqueado', async () => {
    (verifFind as never as { conUltima: (v: unknown) => void }).conUltima(
      verificacion({ attempts: 4 }),
    );

    const r = await service.confirm(USUARIO, METODO, 'ZZZZZZ');

    expect(r.verified).toBe(false);
    expect(verifUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'BLOCKED' }) }),
    );
  });

  it('W-10: un método bloqueado no admite más intentos, ni con el token bueno', async () => {
    (verifFind as never as { conUltima: (v: unknown) => void }).conUltima(
      verificacion({ status: 'BLOCKED', attempts: 5 }),
    );

    await expect(service.confirm(USUARIO, METODO, 'ABC123')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('W-11: una verificación vencida no verifica', async () => {
    // Una cuenta bancaria puede cerrarse; una verificación abierta indefinidamente no significa nada.
    (verifFind as never as { conUltima: (v: unknown) => void }).conUltima(
      verificacion({ expiresAt: new Date(Date.now() - 1000) }),
    );

    const r = await service.confirm(USUARIO, METODO, 'ABC123');

    expect(r.verified).toBe(false);
    expect(verifUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'EXPIRED' }) }),
    );
  });

  it('W-12: sin verificación en curso, declarar un token da 404', async () => {
    (verifFind as never as { conUltima: (v: unknown) => void }).conUltima(null);

    await expect(service.confirm(USUARIO, METODO, 'ABC123')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // ── Idempotencia ─────────────────────────────────────────────────────

  it('W-13: iniciar dos veces no genera un segundo movimiento de dinero', async () => {
    (verifFind as never as { conEnCurso: (v: unknown) => void }).conEnCurso(
      verificacion({ status: 'SENT' }),
    );

    const v = await service.start(USUARIO, METODO);

    expect(verifCreate).not.toHaveBeenCalled();
    expect(v.token).toBe('ABC123');
  });

  it('W-14: un método ya verificado no vuelve a verificarse', async () => {
    metodoFind.mockResolvedValue(metodo({ isVerified: true }));

    await expect(service.start(USUARIO, METODO)).rejects.toBeInstanceOf(BadRequestException);
  });

  // ── Trazabilidad ─────────────────────────────────────────────────────

  it('W-15: el recorrido queda en la traza — es dinero moviéndose', async () => {
    await service.start(USUARIO, METODO);
    expect(trace).toHaveBeenCalled();
  });

  it('W-16: el token NUNCA se escribe en la traza', async () => {
    // Es el secreto que prueba la titularidad: en la traza sería regalarlo a quien la lea.
    const v = await service.start(USUARIO, METODO);

    expect(JSON.stringify(trace.mock.calls)).not.toContain(v.token);
  });
});

import {
  PaymentTraceService,
  TraceEntry,
} from '../../../src/modules/payments/payment-trace.service';

/**
 * PT-086 — Traza completa de la transacción.
 *
 * Cubre CA-02..CA-10 del ENRICHMENT. El criterio que manda sobre todos: **ninguna credencial
 * puede quedar persistida**, y lo redactado se marca en vez de borrarse en silencio.
 */
describe('PaymentTraceService (PT-086)', () => {
  let service: PaymentTraceService;
  let create: jest.Mock;
  let findMany: jest.Mock;
  let errorLog: jest.Mock;

  const base: TraceEntry = {
    reference: 'DEP-08b22a46-49a4-4ece-a8ff-021cce24ed70-1784948505855',
    provider: 'MERCADO_PAGO',
    step: 'PROVIDER_CREATE',
    direction: 'OUTBOUND',
    outcome: 'OK',
  };

  const guardado = () => create.mock.calls[0][0].data;

  beforeEach(() => {
    create = jest.fn().mockResolvedValue({});
    findMany = jest.fn().mockResolvedValue([]);
    errorLog = jest.fn();

    service = new PaymentTraceService(
      { paymentCycleEvent: { create, findMany } } as never,
      { child: jest.fn().mockReturnThis(), info: jest.fn(), error: errorLog } as never,
      { getTraceId: () => 'trace-abc' } as never,
    );
  });

  // ── Estructura de la traza ───────────────────────────────────────────

  it('T-01: registra dirección, paso y referencia', async () => {
    await service.record(base);

    expect(guardado()).toMatchObject({
      direction: 'OUTBOUND',
      step: 'PROVIDER_CREATE',
      reference: base.reference,
    });
  });

  it('T-02: una llamada saliente guarda endpoint, estado HTTP y duración', async () => {
    await service.record({
      ...base,
      endpoint: 'https://api.mercadopago.com/v1/orders',
      httpStatus: 201,
      durationMs: 342,
    });

    expect(guardado()).toMatchObject({
      endpoint: 'https://api.mercadopago.com/v1/orders',
      httpStatus: 201,
      durationMs: 342,
    });
  });

  it('T-03: propaga el traceId para poder cruzar con los logs', async () => {
    await service.record(base);
    expect(guardado().traceId).toBe('trace-abc');
  });

  it('T-04: guarda el cuerpo enviado y el recibido íntegros', async () => {
    await service.record({
      ...base,
      data: {
        request: { total_amount: '250.00', external_reference: base.reference },
        response: { id: 'ORDTST01', status: 'processed' },
      },
    });

    expect(guardado().payload).toEqual({
      request: { total_amount: '250.00', external_reference: base.reference },
      response: { id: 'ORDTST01', status: 'processed' },
    });
  });

  // ── Seguridad: la restricción que condiciona todo ────────────────────

  it('T-05: NO persiste una cabecera Authorization', async () => {
    await service.record({
      ...base,
      data: { headers: { Authorization: 'Bearer APP_USR-secreto-real', 'content-type': 'json' } },
    });

    const json = JSON.stringify(guardado());
    expect(json).not.toContain('APP_USR-secreto-real');
    expect(guardado().payload.headers.Authorization).toBe('[REDACTADO]');
  });

  it('T-06: NO persiste la firma x-signature', async () => {
    await service.record({
      ...base,
      data: { headers: { 'x-signature': 'ts=1,v1=hash-real' } },
    });

    expect(JSON.stringify(guardado())).not.toContain('hash-real');
  });

  it('T-07: redacta credenciales anidadas a cualquier profundidad', async () => {
    await service.record({
      ...base,
      data: { a: { b: { c: { access_token: 'token-profundo' } } } },
    });

    expect(JSON.stringify(guardado())).not.toContain('token-profundo');
  });

  it('T-08: redacta dentro de arrays', async () => {
    await service.record({
      ...base,
      data: { calls: [{ authorization: 'Bearer uno' }, { authorization: 'Bearer dos' }] },
    });

    const json = JSON.stringify(guardado());
    expect(json).not.toContain('Bearer uno');
    expect(json).not.toContain('Bearer dos');
  });

  it('T-09: lo redactado se MARCA, no se borra en silencio', async () => {
    await service.record({
      ...base,
      data: { headers: { Authorization: 'Bearer x' }, nested: { client_secret: 'y' } },
    });

    const marcados = guardado().redactedFields as string[];
    expect(marcados).toContain('headers.Authorization');
    expect(marcados).toContain('nested.client_secret');
  });

  it('T-10: lo que no es credencial se conserva íntegro', async () => {
    await service.record({
      ...base,
      data: { headers: { Authorization: 'Bearer x', 'x-request-id': 'req-1' }, amount: 250 },
    });

    expect(guardado().payload.headers['x-request-id']).toBe('req-1');
    expect(guardado().payload.amount).toBe(250);
  });

  it('T-11: sin campos sensibles no marca nada', async () => {
    await service.record({ ...base, data: { amount: 250 } });
    expect(guardado().redactedFields).toBeUndefined();
  });

  // ── Robustez ─────────────────────────────────────────────────────────

  it('T-12: si escribir la traza falla, NO lanza — el pago sigue', async () => {
    create.mockRejectedValue(new Error('bd caida'));

    await expect(service.record(base)).resolves.toBeUndefined();
    expect(errorLog).toHaveBeenCalled();
  });

  it('T-13: sin contexto de petición (cron) la traza se escribe igual', async () => {
    service = new PaymentTraceService(
      { paymentCycleEvent: { create, findMany } } as never,
      { child: jest.fn().mockReturnThis(), info: jest.fn(), error: errorLog } as never,
      {
        getTraceId: () => {
          throw new Error('sin contexto');
        },
      } as never,
    );

    await service.record(base);

    expect(create).toHaveBeenCalled();
    expect(guardado().traceId).toBeNull();
  });

  it('T-14: una estructura ciclica no cuelga la redaccion', async () => {
    const ciclico: Record<string, unknown> = { nombre: 'raiz' };
    ciclico.self = ciclico;

    await expect(service.record({ ...base, data: ciclico })).resolves.toBeUndefined();
  });

  // ── Serialización: lo que hizo perder entradas en silencio ───────────

  it('T-16: un Decimal de Prisma no rompe la escritura', async () => {
    // Prisma devuelve Decimal para los importes. JSONB solo admite objetos planos: sin
    // normalizarlo, la escritura fallaba entera y la entrada se perdía sin que nadie lo notara.
    class Decimal {
      constructor(private readonly v: string) {}
      toJSON() {
        return this.v;
      }
    }

    await service.record({ ...base, data: { saldo: new Decimal('5232.25') } });

    expect(create).toHaveBeenCalled();
    expect(guardado().payload.saldo).toBe('5232.25');
  });

  it('T-17: una fecha se guarda en formato ISO', async () => {
    await service.record({ ...base, data: { cuando: new Date('2026-07-26T08:00:00Z') } });

    expect(guardado().payload.cuando).toBe('2026-07-26T08:00:00.000Z');
  });

  it('T-18: una instancia sin toJSON no rompe la escritura', async () => {
    class Rara {
      toString() {
        return 'valor-raro';
      }
    }

    await service.record({ ...base, data: { x: new Rara() } });

    expect(create).toHaveBeenCalled();
    expect(guardado().payload.x).toBe('valor-raro');
  });

  // ── Consulta ─────────────────────────────────────────────────────────

  it('T-15: la traza se consulta por referencia, en orden cronológico', async () => {
    await service.byReference(base.reference);

    expect(findMany).toHaveBeenCalledWith({
      where: { reference: base.reference },
      orderBy: { receivedAt: 'asc' },
    });
  });
});

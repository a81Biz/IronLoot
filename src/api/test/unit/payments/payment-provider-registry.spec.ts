import { PaymentProviderRegistry } from '../../../src/modules/payments/payment-provider.registry';

/**
 * PT-080.14 — Registro de proveedores.
 *
 * Cubre C-01..C-06 de changes/PT-080-payment-cycle/test-scenarios.md.
 *
 * La barra de calidad no es opinable: **añadir un adaptador no debe requerir editar
 * `payments.service.ts`, y quitarlo tampoco**. Antes hacían falta cinco ediciones
 * (switch de initiatePayment, if/else de handleWebhook, mapa de alias,
 * getAvailableProviders y el tipado en duro de reconcilePayments).
 */

/** Adaptador ficticio: se declara a sí mismo, igual que uno real. */
const fakeProvider = (key: string, aliases: string[] = [], configured = true) => ({
  key,
  aliases,
  checkStatus: () => configured,
  initiatePayment: jest.fn(),
  validateWebhook: jest.fn().mockResolvedValue(true),
  handleWebhook: jest.fn().mockResolvedValue(null),
  getTransactionStatus: jest.fn(),
});

describe('PaymentProviderRegistry (PT-080)', () => {
  it('C-01: resuelve un adaptador nuevo por su clave, sin tocar el servicio', () => {
    const registry = new PaymentProviderRegistry([
      fakeProvider('MERCADO_PAGO'),
      fakeProvider('PASARELA_FICTICIA'),
    ] as never);

    expect(registry.resolve('PASARELA_FICTICIA')?.key).toBe('PASARELA_FICTICIA');
  });

  it('C-02: al retirar el adaptador, el registro simplemente deja de conocerlo', () => {
    const registry = new PaymentProviderRegistry([fakeProvider('MERCADO_PAGO')] as never);

    expect(registry.resolve('PASARELA_FICTICIA')).toBeNull();
    expect(registry.resolve('MERCADO_PAGO')).not.toBeNull();
  });

  it('C-03: resuelve por alias en minúsculas (regresión de PT-064)', () => {
    const registry = new PaymentProviderRegistry([
      fakeProvider('MERCADO_PAGO', ['mercadopago']),
    ] as never);

    expect(registry.resolve('mercadopago')?.key).toBe('MERCADO_PAGO');
    expect(registry.resolve('MERCADOPAGO')?.key).toBe('MERCADO_PAGO');
  });

  it('C-03b: resuelve la clave canónica en cualquier caja', () => {
    const registry = new PaymentProviderRegistry([
      fakeProvider('HEY_BANCO', ['heybanco']),
    ] as never);

    expect(registry.resolve('hey_banco')?.key).toBe('HEY_BANCO');
    expect(registry.resolve('heybanco')?.key).toBe('HEY_BANCO');
  });

  it('C-05: solo lista los proveedores realmente configurados', () => {
    const registry = new PaymentProviderRegistry([
      fakeProvider('MERCADO_PAGO', [], true),
      fakeProvider('PAYPAL', [], false),
    ] as never);

    expect(registry.availableKeys()).toEqual(['MERCADO_PAGO']);
  });

  it('C-06: MercadoPago configurado sigue apareciendo (guarda R-12 de PT-076)', () => {
    const registry = new PaymentProviderRegistry([
      fakeProvider('MERCADO_PAGO', [], true),
      fakeProvider('STRIPE', [], false),
    ] as never);

    expect(registry.availableKeys()).toContain('MERCADO_PAGO');
  });

  it('C-06b: un proveedor desconocido devuelve null en vez de reventar', () => {
    const registry = new PaymentProviderRegistry([fakeProvider('MERCADO_PAGO')] as never);

    expect(registry.resolve('no-existe')).toBeNull();
    expect(registry.resolve('')).toBeNull();
    expect(registry.resolve(undefined as never)).toBeNull();
  });
});

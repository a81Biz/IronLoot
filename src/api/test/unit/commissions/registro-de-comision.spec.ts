import { CommissionsService } from '../../../src/modules/commissions/commissions.service';

/**
 * PT-114 (PTSA H-010) — Toda venta liquidada genera su registro de comision.
 *
 * `commission_records` tenia **0 filas** mientras el ledger registraba **95.00 MXN** de
 * `FEE_PLATFORM` cobrados. `calculateForOrder()` era el unico sitio que creaba el registro y
 * **no lo invocaba nadie en produccion**: sus tres referencias estaban en los tests. Una funcion
 * probada que nunca corria.
 *
 * El dinero se cobraba bien —el vendedor recibia su neto—; lo que fallaba era la contabilidad: el
 * informe financiero del panel lee `commissionRecord.findMany()` y declaraba cero ingresos.
 *
 * Lo que estos tests fijan, y por que `recordForOrder` no llama a `calculateForOrder`:
 * **la cifra del registro es la que ya se asento**, no una recalculada. Dos calculos
 * independientes de la misma comision divergen en cuanto cambie la tarifa del vendedor, y
 * entonces el ledger y la contabilidad dicen numeros distintos.
 */
describe('El registro de comision nace con la cifra que se asento (PT-114)', () => {
  let servicio: CommissionsService;
  let tx: {
    commissionRecord: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    order: { findUnique: jest.Mock };
  };

  const PEDIDO = 'order-uuid-1';
  const VENDEDOR = 'seller-uuid-1';

  beforeEach(() => {
    tx = {
      commissionRecord: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'cr-1' }),
      },
      order: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: PEDIDO, sellerId: VENDEDOR, totalAmount: 950 }),
      },
    };
    servicio = new CommissionsService(tx as never);
  });

  it('CM-01: cerrar una venta crea el registro de su comision', async () => {
    await servicio.recordForOrder(PEDIDO, 10, tx as never);

    expect(tx.commissionRecord.create).toHaveBeenCalledTimes(1);
  });

  it('CM-02: el importe es el mismo que se asento en el ledger', async () => {
    // 950 x 10% = 95.00 — exactamente el FEE_PLATFORM que asienta captureHeldFunds.
    await servicio.recordForOrder(PEDIDO, 10, tx as never);

    const datos = tx.commissionRecord.create.mock.calls[0][0].data;
    expect(Number(datos.amount)).toBeCloseTo(95.0, 2);
  });

  it('CM-05: guarda la tarifa con la que se calculo', async () => {
    await servicio.recordForOrder(PEDIDO, 7.5, tx as never);

    const datos = tx.commissionRecord.create.mock.calls[0][0].data;
    expect(Number(datos.ratePercent)).toBe(7.5);
    expect(Number(datos.amount)).toBeCloseTo(71.25, 2);
  });

  it('CM-03: cerrar dos veces NO duplica el registro', async () => {
    // Un reintento del cierre no puede producir dos asientos contables de la misma venta.
    // Es la misma leccion que la unicidad de `Payment.reference` (PT-087).
    tx.commissionRecord.findUnique.mockResolvedValue({ id: 'cr-existente' });

    await servicio.recordForOrder(PEDIDO, 10, tx as never);

    expect(tx.commissionRecord.create).not.toHaveBeenCalled();
  });

  it('CM-04: si el pedido no existe, NO inventa un registro', async () => {
    tx.order.findUnique.mockResolvedValue(null);

    await expect(servicio.recordForOrder(PEDIDO, 10, tx as never)).rejects.toThrow(/pedido/i);
    expect(tx.commissionRecord.create).not.toHaveBeenCalled();
  });

  it('CM-07: usa la transaccion que se le pasa, no una conexion nueva', async () => {
    // Si escribiera fuera de la transaccion del cierre, un fallo posterior dejaria la venta
    // deshecha y el registro escrito — justo el descuadre que este PT viene a impedir.
    const otraTx = {
      commissionRecord: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      order: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: PEDIDO, sellerId: VENDEDOR, totalAmount: 100 }),
      },
    };

    await servicio.recordForOrder(PEDIDO, 10, otraTx as never);

    expect(otraTx.commissionRecord.create).toHaveBeenCalledTimes(1);
    expect(tx.commissionRecord.create).not.toHaveBeenCalled();
  });
});

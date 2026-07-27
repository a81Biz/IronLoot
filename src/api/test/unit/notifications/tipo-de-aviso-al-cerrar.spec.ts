import { NotificationType } from '@prisma/client';

/**
 * PT-117 (PTSA H-012) — El tipo de aviso identifica el EVENTO, no el momento.
 *
 * Al cerrar una subasta se emitian dos notificaciones con el mismo tipo y significados distintos:
 * al comprador «has ganado» y al vendedor «tu subasta se vendio», ambas `AUCTION_WON`. El propio
 * codigo lo declaraba:
 *
 *     NotificationType.AUCTION_WON, // Reuse type or add AUCTION_SOLD if exists, for now WON…
 *
 * No hacia daño visible —el titulo y el mensaje si distinguen los dos casos— pero el **tipo**
 * dejaba de servir como discriminador: un filtro por `AUCTION_WON` para mostrar «mis subastas
 * ganadas» le enseñaria al vendedor su propia venta como una victoria.
 *
 * Era lo unico que impedia que P-007 llegara a VALIDADO: el producto se fija a si mismo el
 * invariante «tipo de notificacion correcto para el evento».
 */
describe('El tipo de aviso identifica el evento (PT-117)', () => {
  it('TA-01: el catalogo tiene un tipo propio para la venta', () => {
    // Sin este valor, el aviso al vendedor no tiene donde ir mas que al del comprador.
    expect(NotificationType).toHaveProperty('AUCTION_SOLD');
  });

  it('TA-02: comprar y vender son eventos distintos, con tipos distintos', () => {
    expect(NotificationType.AUCTION_SOLD).not.toBe(NotificationType.AUCTION_WON);
  });

  it('TA-03: el catalogo conserva los tipos que ya existian', () => {
    // Anadir un valor a un enum es aditivo: ningun consumidor de los anteriores puede romperse.
    for (const previo of [
      'AUCTION_WON',
      'AUCTION_LOST',
      'BID_OUTBID',
      'ORDER_PAID',
      'ORDER_SHIPPED',
      'DISPUTE_UPDATE',
      'SYSTEM',
    ]) {
      expect(NotificationType).toHaveProperty(previo);
    }
  });
});

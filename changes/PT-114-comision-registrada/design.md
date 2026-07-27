# PT-114 — design.md

**BUG · STANDARD · H-010 (PTSA D1, ALTA)**

## D1 — Una sola fuente para la cifra

Lo obvio sería llamar a `calculateForOrder()` después del cierre. Y sería el defecto peor: esa
función **recalcula** la comisión resolviendo la tarifa por su cuenta, mientras `captureHeldFunds`
ya la calculó con el `feePercent` que le pasó el orquestador.

Dos cálculos independientes de la misma cifra divergen en cuanto la tarifa del vendedor cambie
entre el cierre y la llamada. Y entonces el ledger dice 95.00 y la contabilidad dice otra cosa, y
alguien tiene que averiguar cuál miente.

**El registro nace con la cifra que ya se asentó.**

## D2 — Dentro de la misma transacción

El orquestador ya envuelve la creación del pedido y la captura de fondos en una transacción. El
registro entra ahí.

Si falla, la venta entera se deshace. La alternativa —crearlo después, fuera— deja exactamente el
estado que este PT viene a arreglar: cobrado y sin registrar.

## D3 — Lo hace el orquestador, no la cartera

`WalletModule` no debe depender de `CommissionsModule`. La cartera es infraestructura de dinero; las
comisiones son política de negocio. Meter la creación dentro de `captureHeldFunds` invertiría esa
dependencia y ataría el movimiento de dinero a una regla que puede cambiar.

El orquestador ya depende de ambos: es su trabajo coordinarlos.

## D4 — `calculateForOrder()` se queda, con su papel dicho

No se borra. Sirve para **reconstruir** un registro ausente en pedidos históricos, resolviendo la
tarifa por su cuenta porque ahí no hay otra fuente.

Pero deja de ser el camino normal, y se documenta: hoy, que hubiera un método público que *parecía*
el camino y no lo invocaba nadie es parte de por qué esto pasó desapercibido.

## Lo que este PT NO hace

- No reconstruye los registros históricos. Eso es escribir contabilidad con fecha pasada y es
  decisión del humano.
- No cambia el informe financiero para que lea el ledger: PTSA audita **productos**, y el producto
  P-010 tiene que generarse.
- No cierra H-010.

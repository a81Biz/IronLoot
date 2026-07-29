# PT-174 — Cambios de especificación

## La regla nueva, y es de negocio

**La recepción la confirma quien recibe, y el dinero espera 72 h desde esa confirmación.**

| | Antes | Después |
|---|---|---|
| Quién marca `SHIPPED` | vendedor | vendedor *(sin cambio)* |
| Quién marca `DELIVERED` | **vendedor** | **comprador** |
| Cuándo se libera el holdback | al marcar `DELIVERED`, inmediato | **72 h después de la confirmación**, o a los 14 días |
| Si el comprador calla | — *(no podía)* | a los 14 días se libera igual |

## Las dos mentiras, ahora las dos contempladas

- **El vendedor miente al enviar** → ya no puede: no tiene la llave de `DELIVERED`.
- **El comprador miente al no recibir** → no bloquea el dinero: `DISPUTE_WINDOW_DAYS` vence y libera.

Antes sólo se protegía la segunda, y **por accidente**: el vencimiento existía como efecto lateral de la
consulta del cron. Ahora es una regla declarada, con su prueba.

## Variable de entorno nueva

`SETTLEMENT_HOLDBACK_HOURS` — **72**. Horas que el neto de una venta espera en `pending_balance` tras la
confirmación del comprador. En QA se pone a `0`.

**Lleva valor por defecto a propósito**, al contrario que las de conexión (RULE-17): un valor ausente aquí
no deja el sistema «configurado hacia ninguna parte», sólo elige una política de riesgo. La diferencia
importa, porque RULE-17 nació de un defecto real y no conviene aplicarla donde no toca.

## Endpoint nuevo

`POST /api/v1/diagnostics/scheduler/release-settlements` — dispara la liberación. **Sólo desarrollo**:
`DiagnosticsController` ya lleva `DevelopmentOnlyGuard` a nivel de clase y aborta con 403 si
`NODE_ENV=production`.

## Documentos a tocar

- `CLAUDE.md` — la regla de entrega/recepción y la espera de 72 h.
- `.env.example` — `SETTLEMENT_HOLDBACK_HOURS=72`.
- `docs-v2/` — **no** en este PT: la mantienen personas (ADR-049). Se anota aparte qué necesitarían saber.

# PLAN_ACTUAL — PT-117: el vendedor recibe su propio tipo de aviso (H-012)

**Fecha**: 2026-07-27 · **Tipo**: BUG · **Complejidad**: TRIVIAL · **Estado**: STATE 2
**Entrada**: `DISCOVERY.md` § PT-117 · PTSA H-012

---

## 1. Objetivo

Que el tipo de notificacion identifique el evento, no el momento. Es lo unico que separa a P-007 de
`VALIDADO`.

## 2. Solucion

1. **`AUCTION_SOLD` al enum** `NotificationType`, en Prisma y en la BD.
2. **`auction-scheduler.service.ts:204`** lo usa para el aviso al vendedor.
3. El comentario del atajo desaparece: ya no hay atajo que explicar.

## 3. Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| **Dejarlo y documentarlo** | Es lo que habia. El comentario ya lo documentaba, y aun asi el invariante de P-007 no se cumplia |
| **Distinguir por `entityType` o por el titulo** | El titulo ya distingue; el problema es que el **tipo** no. Un filtro por tipo seguiria mintiendo |
| **Renombrar `AUCTION_WON` a algo neutro** | Rompe a todos los consumidores existentes para arreglar un caso |

## 4. Analisis de regresion

| Que | Riesgo | Como se comprueba |
|---|---|---|
| **La migracion del enum** | `ALTER TYPE … ADD VALUE` **no corre dentro de una transaccion** en PostgreSQL. Si se envuelve, falla | Se aplica suelto con `psql` y se verifica el `enum_range` |
| Las notificaciones existentes | Ninguna: anadir un valor no toca las filas | `SELECT` sobre `notifications` antes y despues |
| Los consumidores del tipo | Que alguien espere solo los siete valores viejos | `grep` sobre `AUCTION_WON` en los tres sitios |
| El cierre de subasta | Es la ruta del dinero | Cerrar una subasta real y mirar la BD |

## 5. Criterios de exito

1. `AUCTION_SOLD` existe en el enum de la BD y en Prisma.
2. Tras cerrar una subasta: el comprador recibe `AUCTION_WON`, el vendedor `AUCTION_SOLD`.
3. **Cero** notificaciones `AUCTION_WON` cuyo destinatario no tenga pedido.
4. `npm test` y suite en verde.

## 6. Restricciones

- Test en RED antes (RULE-06).
- El SQL se comprueba **aditivo** antes de aplicarlo.
- H-012 **no se cierra**: lo cierra el humano.

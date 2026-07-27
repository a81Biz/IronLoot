# PT-076.17 — Regresión por navegador (parcial)

**Fecha**: 2026-07-25 | **Rama**: `master` (PT-076 + PT-078 + PT-079 fusionados)
**Salida**: `qa-out/20260725-230812`

---

## Resultado: 148/148 PASS

| Fase | Resultado |
|---|---|
| 00 smoke (rutas BASE/CLIENT/ADMIN) | ✅ 57/57 |
| 10 bootstrap (mundo con vendedor KYC-gated) | ✅ 13/13 |
| 20 authed (rutas autenticadas) | ✅ 41/41 |
| 30 e2e (puja, bloqueo de fondos, outbid, liberación) | ✅ 5/5 |
| 40 extras (auth, responsive, CSP, cross-browser) | ✅ 16/16 |
| 50 admin-writes | ✅ 4/4 |
| 60 withdrawal (retiro real del vendedor) | ✅ 12/12 |

Comparación con la línea base de PT-076.1: sin regresiones. La última run conocida antes de
estos cambios (20260724-232401) también era 100% verde.

### Estado de la BD tras la run

```
orders=0  auctions_closed=0  auctions_active=1  bids=2
ledger=9  withdrawals=2  processed_webhook_events=0
```

`/orders`, `/seller/orders` y `/auctions/won-auctions` renderizan tabla vacía. **No es un
defecto**: `orders=0` porque la subasta sigue `ACTIVE` (cierra el 2026-07-26T07:05). Las
pujas y las subastas del vendedor sí muestran datos.

---

## Lo que esta ejecución NO valida

**`processed_webhook_events = 0`** lo confirma de forma objetiva: **la suite nunca llamó a
`POST /payments/webhook/:provider`**.

El harness fondea el wallet con un `INSERT` directo en la BD —
`10-bootstrap.cjs:241-249`, comentado como *"fondeo de prueba (pasarela fuera de alcance)"*—
de modo que `creditOnce()`, la reserva de deduplicación de PT-078 y la nueva propagación de
errores **no se ejercitan en ningún punto de la suite**.

Por tanto siguen **sin verificación funcional**:

| Criterio | PT | Qué falta |
|---|---|---|
| CA-10, CA-12-real | PT-076 | Depósito real en PayPal sandbox y reenvío de webhook |
| Criterios 1–4 en entorno real | PT-078 | Entrega real de webhook firmado, y entrega duplicada |

La prueba pendiente para PT-078 es: `mp-deposit.cjs` (checkout real, requiere pago humano) →
`mp-credit.cjs` (firma el webhook con el secret real y lo entrega) **dos veces**, y comprobar
que el saldo sube una sola vez y que `processed_webhook_events` tiene exactamente una fila.

---

## Incidencias del entorno (no del producto)

1. **Primera ejecución inválida**: el stack de Docker se cayó durante la run. Los contenedores
   de `api`, `base`, `client`, `admin` y `nginx` desaparecieron y quedaron en estado `Created`
   sin arrancar; los 57 checks de smoke fallaron contra servicios inexistentes. Restaurado con
   `docker-compose up -d` + `docker start`. Tras la recreación, **BASE y ADMIN pasaron a
   `healthy`**, cuando llevaban toda la sesión marcados como *unhealthy*.

2. **Playwright no estaba instalado** en `tests/qa-browser-suite/`: faltaban el paquete y los
   tres navegadores (chromium, firefox, webkit). Requisito no documentado del harness — en una
   máquina limpia la suite no arranca. Corregido con `npm install` +
   `npx playwright install chromium firefox webkit`.

3. **El entrypoint de la API ejecuta `prisma db push --accept-data-loss` en cada arranque**
   (`scripts/entrypoint.dev.sh:46-54`). Consecuencias verificadas: no existe tabla
   `_prisma_migrations` en la BD de desarrollo, y el cliente Prisma se regenera solo (el paso
   manual que había anotado en el HANDOFF era innecesario). Es la violación de ADR-006 ya
   registrada como AUD-001, ahora con evidencia directa.

---

## Estado

PT-076.17 **parcialmente completo**: la parte de navegador está verde; falta el depósito real
por MercadoPago que el propio plan exigía.

# Self-Review — PT-048..055 (Hallazgos QA Navegador)

**Fecha:** 2026-07-24 · **Rama:** `fix/PT-048-qa-navegador-findings`
**Método de evidencia:** verificación por navegador visible (Playwright) con BD desde cero.

## Resultado de verificación: 9/9 PASS

```
PASS PT-048-deposit          → redirige a MercadoPago (201 /payments/initiate)
PASS PT-048-enable-seller     → vendedor activado → /seller/auctions
PASS PT-048-create-auction    → subasta creada → /seller/auctions
PASS PT-050-disputes          → HTTP 200 (antes 500)
PASS PT-053-contact           → HTTP 200
PASS PT-054-auction-404       → HTTP 404 (antes 200)
PASS PT-049-commission-500    → sin 500 (antes 500)
PASS PT-051-notification      → ?sent=1 + campaña persistida
PASS PT-052-cms               → HTTP 200, 4 bloques, sin 4xx
```
Detalle máquina: `verify.json`.

## Verificación en BD (persistencia real desde cero)

| Tabla | Conteo | Significado |
|---|---|---|
| auctions | 1 | subasta creada vía UI |
| audit_events | 58 | auditoría persiste (antes crasheaba) |
| notification_campaigns | 4 | broadcast persiste |
| commission_config | 1 | comisión global fijada |
| users (is_seller) | 1 | vendedor activado |

`Error creating UUID` en logs (últimos 5 min): **0**.

## Checklist de auto-revisión

- [x] Criterios verificados por ejecución (no solo código).
- [x] Sin regresiones: typecheck OK en API/ADMIN/BASE; hooks pre-commit (eslint+prettier+typecheck) pasaron en cada commit.
- [x] Convenciones respetadas (patrón BFF/proxy en CLIENT, patrón server-side render en ADMIN, DTOs del API sin cambios de contrato).
- [x] Commits atómicos por PT, nombrados con convención y trazables.
- [x] Sin console.log/código muerto nuevo (se eliminó el select `condition` muerto).
- [x] Documentación de hallazgos actualizada.

## Alcance y decisiones

- **Lado autoritativo:** se corrigió el **frontend** para respetar los contratos reales del API
  (los DTOs no se modificaron) — menor riesgo de romper otros consumidores/Swagger.
- **Depósito:** se reapunta a `/payments/initiate` (que ya esperaba `{amount, provider}`), en vez de
  inventar un flujo de referenceId.
- **Auditoría:** se sanea el id no-UUID a null/nil-UUID y se preserva en payload; no se alteró el schema.

## Pendientes menores (no bloqueantes, fuera de estos PT)

- FINDING-QA-04/06: favicon 404 y 1 error JS aislado en ADMIN /refunds y /seo (el de /cms se resolvió con PT-052).
- Overflow móvil del **dashboard CLIENT** (sidebar fijo) — las páginas públicas quedaron corregidas (PT-055);
  el rediseño responsive del sidebar del portal es un follow-up mayor.

# PT-026 — Specification Changes

---

## Cambios en documentación de arquitectura

### DISCOVERY.md
Actualizar el entry PT-026 para reflejar que pasó de STATE 1-B a IMPLEMENTADO tras el fix.

### 11-Conventions.md (docs/enterprise-documentation/ — disco local)
Agregar nota sobre el patrón de lectura de config en tiempo real:
> **Configuración dinámica en runtime**: Para parámetros de negocio configurable por admin, usar siempre `SystemConfigService.getNumber()` / `getString()` en lugar de `ConfigService`. Patrón verificado en `AuctionSchedulerService` y `BidsService`. El módulo debe agregar `SystemConfigModule` a sus `imports`.

### HISTORY.log
Entrada PT-026 al completar STATE 7.

---

## Sin cambios en

- API pública (nenhún endpoint nuevo ni modificado)
- Schema Prisma (ningún modelo afectado)
- `.env.example` (`AUCTION_SOFT_CLOSE_WINDOW_SEC` ya documentada)
- Swagger/OpenAPI docs

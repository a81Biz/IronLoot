# PT-026 — Tasks
## BidsService: EXTENSION_MS hardcodeado → SystemConfigService

**Branch**: `fix/PT-026-bids-soft-close-config`

---

## PT-026.1 — Escribir tests que fallen (RED)

**Objetivo**: Tests que verifican que la ventana de soft-close usa el valor de configuración, no 300s.
**Inputs**: `src/api/test/unit/bids/bids.service.spec.ts` (existente)
**Outputs**: Tests que fallan con el código actual (`EXTENSION_MS = 5 * 60 * 1000`)
**Validation**: `npx jest --testPathPattern="bids.service" --no-coverage` → tests FAIL con valor 300000ms

```typescript
// Mock: SystemConfigService.getNumber retorna 120 (correcto)
// Assertion: newEndsAt === now + 120s (no 300s)
```

**Status**: PENDING

---

## PT-026.2 — Agregar SystemConfigModule a BidsModule.imports

**Objetivo**: Hacer disponible `SystemConfigService` para inyección en `BidsService`.
**Inputs**: `src/api/src/modules/bids/bids.module.ts`
**Outputs**: `imports: [WalletModule, NotificationsModule, AuctionsModule, SystemConfigModule]`
**Validation**: `npm run typecheck` — sin errores de inyección

**Status**: PENDING

---

## PT-026.3 — Inyectar SystemConfigService en BidsService

**Objetivo**: Agregar `SystemConfigService` al constructor de `BidsService`.
**Inputs**: `src/api/src/modules/bids/bids.service.ts`
**Outputs**: 
- Import: `import { SystemConfigService } from '../system-config/system-config.service';`
- Constructor: `private readonly systemConfigService: SystemConfigService` (último parámetro)
**Validation**: `npm run typecheck` — sin errores

**Status**: PENDING

---

## PT-026.4 — Reemplazar EXTENSION_MS con lectura dinámica

**Objetivo**: Eliminar la constante literal y usar `systemConfigService.getNumber()`.
**Inputs**: `src/api/src/modules/bids/bids.service.ts` líneas 98-108
**Outputs**:
```typescript
// Eliminar:
const EXTENSION_MS = 5 * 60 * 1000;

// Agregar antes de timeRemaining:
const extensionMs = (await this.systemConfigService.getNumber('AUCTION_SOFT_CLOSE_WINDOW_SEC', 120)) * 1000;

// Cambiar líneas 106-107:
if (timeRemaining < extensionMs) {
  newEndsAt = new Date(auction.endsAt.getTime() + extensionMs);
}
```
**Validation**: `npm run typecheck` — sin errores; `npx jest --testPathPattern="bids.service"` → tests PASS

**Status**: PENDING

---

## PT-026.5 — Commit atómico + verificación final

**Objetivo**: Commit con todos los cambios, typecheck limpio, tests verdes.
**Inputs**: Cambios en bids.module.ts, bids.service.ts, bids.service.spec.ts
**Outputs**: 
- Commit: `fix: PT-026 replace hardcoded EXTENSION_MS with SystemConfigService`
- `npm run typecheck` → 0 errores
- `npm test` → sin regresiones en toda la suite
**Validation**: Output de `npm test` completo sin failures

**Status**: PENDING

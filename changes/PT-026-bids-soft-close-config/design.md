# PT-026 — Design Document
## BidsService: EXTENSION_MS hardcodeado → SystemConfigService

**Fecha**: 2026-06-23 | **Tipo**: BUG STANDARD | **Complexity**: STANDARD

---

## Decisión arquitectónica principal

**Usar `SystemConfigService` (no `ConfigService`) para leer `AUCTION_SOFT_CLOSE_WINDOW_SEC`.**

| Opción | Pros | Contras | Decisión |
|---|---|---|---|
| `ConfigService` (env var) | Síncrono, sin dependencia de DB | No refleja cambios admin en runtime; requiere restart | RECHAZADA |
| `SystemConfigService` (DB + env fallback) | Runtime-configurable; consistente con scheduler | Async (no issue — `placeBid()` ya es async) | **ELEGIDA** |

`AuctionSchedulerService` ya usa `SystemConfigService.getNumber('AUCTION_SOFT_CLOSE_WINDOW_SEC', 120)` para calcular la ventana de cierre. `BidsService` debe usar el mismo servicio y la misma key para garantizar coherencia: el scheduler no cierra antes de que el extensor extienda, y viceversa.

---

## Archivos afectados

| Archivo | Cambio | Tipo |
|---|---|---|
| `src/api/src/modules/bids/bids.module.ts` | Agregar `SystemConfigModule` a `imports` | Config |
| `src/api/src/modules/bids/bids.service.ts` | Inyectar `SystemConfigService`; reemplazar `EXTENSION_MS` | Implementation |
| `src/api/test/unit/bids/bids.service.spec.ts` | Mockear `SystemConfigService`; tests del fix | Test |

---

## Cambio en `bids.module.ts`

```typescript
// Antes:
imports: [WalletModule, NotificationsModule, AuctionsModule],

// Después:
import { SystemConfigModule } from '../system-config/system-config.module';

imports: [WalletModule, NotificationsModule, AuctionsModule, SystemConfigModule],
```

---

## Cambio en `bids.service.ts`

```typescript
// Antes (línea 98):
const EXTENSION_MS = 5 * 60 * 1000;
let timeRemaining = 0;
let newEndsAt = auction.endsAt;

timeRemaining = auction.endsAt.getTime() - now.getTime();
if (timeRemaining < EXTENSION_MS) {
  newEndsAt = new Date(auction.endsAt.getTime() + EXTENSION_MS);
}

// Después:
const extensionMs = (await this.systemConfigService.getNumber('AUCTION_SOFT_CLOSE_WINDOW_SEC', 120)) * 1000;
let timeRemaining = 0;
let newEndsAt = auction.endsAt;

timeRemaining = auction.endsAt.getTime() - now.getTime();
if (timeRemaining < extensionMs) {
  newEndsAt = new Date(auction.endsAt.getTime() + extensionMs);
}
```

Constructor addition:
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly logger: StructuredLogger,
  private readonly ctx: RequestContextService,
  private readonly walletService: WalletService,
  private readonly notificationsService: NotificationsService,
  private readonly audit: AuditPersistenceService,
  private readonly auctionsGateway: AuctionsGateway,
  private readonly systemConfigService: SystemConfigService,  // ← ADD
) {
  this.log = this.logger.child('BidsService');
}
```

Import addition:
```typescript
import { SystemConfigService } from '../system-config/system-config.service';
```

---

## Invariantes preservados

- `placeBid()` permanece completamente async — sin cambio de signatura
- La `ChildLogger` y el `ChildLogger.child('BidsService')` no se modifican
- La transacción de Prisma y el WebSocket broadcast no cambian
- El comportamiento `if (timeRemaining < extensionMs)` es idéntico — solo el valor de la derecha cambia
- Default 120 (no 300) — el bug era que 300 era el valor incorrecto

---

## Análisis de dependencia circular

```
BidsModule → SystemConfigModule → [PrismaService, ConfigService]
BidsModule → WalletModule → [PrismaService]
```

`SystemConfigModule` no importa `BidsModule` → sin ciclo.

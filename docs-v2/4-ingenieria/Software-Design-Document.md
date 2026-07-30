# Software Design Document (SDD) y Convenciones — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia |
| **Fuente** | `audit/raw/B/D/E/F`, 11-Conventions, código |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 11-Conventions, 06-Backend |
| **Código usado** | `src/api`, `src/apps/*`, `src/admin`, `src/packages/core` |
| **Nivel de confianza** | Alto |

## 1. Estructura del código

```
src/
├── api/          NestJS REST+WS · src/modules/<feature>/{*.controller,*.service,*.module,dto/,guards/}
│   ├── common/   config, decorators, guards, pipes, redis(lock), observability
│   └── prisma/   schema.prisma + migrations/
├── apps/base/    SSR público  · src/app.controller.ts · views/{layouts,pages} · public/css
├── apps/client/  SSR privado  · igual convención
├── admin/        SSR backoffice · src/modules/<feature>/ · views/ · public/js
├── packages/core/ dominio · src/{domain,application,contracts,events,integrations}
└── nginx/        reverse proxy
```

## 2. Patrones de diseño en uso

| Patrón | Aplicación | Evidencia |
|---|---|---|
| Modular NestJS | 1 módulo por feature con controller+service+module | `src/api/src/modules/*` |
| BFF | SSR guarda JWT en cookie y proxya al API | `base/src/main.ts:73` (roto en CLIENT, `AUD-003`) |
| Repository/Port (core) | use-cases dependen de `contracts/` | `packages/core` (no cableado, `AUD-012`) |
| State Machine | transiciones válidas en core | `*-state-machine.ts` (admin las salta, `AUD-011`) |
| Provider abstraction | pagos por proveedor intercambiable | `payments/providers/*` |
| Distributed lock | cierre idempotente | `distributed-lock.service.ts` |
| Interceptor/Filter | audit/log + manejo de error | `common/observability` |

## 3. Diagramas de secuencia (clave)

### Puja (backend)
```
Cliente → API POST /auctions/:id/bids
API → BidValidation.validate (core)         [RN-13/15]
API → WalletService.holdFunds (TX)          [RN-22]
API → crea Bid, actualiza currentPrice
API → libera held del líder anterior        [RN-23]
API → (si tardía) soft-close extiende endsAt [RN-17]
API → AuctionsGateway emit bid:new/auction:extended
```

### Cierre (scheduler)
```
Cron(1m) → adquiere lock:auction-close (Redis)
  → ACTIVE & endsAt≤now → CLOSED
  → gana puja más alta → Order PAID
  → DEBIT_ORDER(ganador) + CREDIT_SALE(vendedor) − FEE_PLATFORM  [RN-30/31]
  → libera held de perdedores → notifica → emit auction:ended
  → libera lock
```

### Depósito por webhook
```
Proveedor → API POST /payments/webhook/:provider
API → valida firma del webhook               [RN-50]
API → si COMPLETED & ref DEP-<user>-<ts> → WalletService acredita monto verificado [RN-24]
```

## 4. Convenciones (reconciliadas con la realidad)

| Convención | Regla | Estado real |
|---|---|---|
| Nombres de archivo | `kebab-case.tipo.ts` (`auth.service.ts`) | ✅ |
| Tablas/columnas | `snake_case` vía `@map` | ✅ |
| Dinero | `Decimal`, nunca `Float`; MXN | ⚠️ **Money VO sigue sin usarse (AUD-012, abierto)**; `payments` en `MXN` — **AUD-008 corregido** |
| Webhooks | validar firma antes de procesar (HARD RULE) | ✅ |
| Ledger | insert-only; corrección vía ADJUSTMENT (HARD RULE) | ✅ |
| JS de frontend | `public/js/pages/*.js` | ✅ 10 ficheros; el JS **inline está prohibido** y lo vigilan `plantillas-sin-js-inline.spec.ts` y `estilos-fuera-de-plantillas.spec.ts` (PT-096/PT-105). AUD-030 corregido |
| Tests-first (FDGE) | test RED antes de código | (gobernanza) |

## 5. Configuración runtime

Config de negocio en `SystemConfig` (seed desde env, override en Admin): soft-close, moderación, incremento (no aplicado), duración, verificación email, KYC, expiración de pago, ventana de disputa. Ver [Integraciones-y-Configuracion.md](Integraciones-y-Configuracion.md).

## 6. Archivos que requieren cuidado especial

- `wallet.service.ts` (dinero/ledger), `auction-scheduler.service.ts` (cierre/settlement), `bids.service.ts` (hold/race), `payments/providers/*` (firmas), `prisma/schema.prisma` (drift), `admin.service.ts` (god-object, salta FSM), `*/src/main.ts` (seguridad/BFF).

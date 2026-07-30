# Matriz Global de Trazabilidad — IronLoot (Oficial)

| Metadato | Valor |
|---|---|
| **Origen** | Promoción de `audit/deliverables/02-Matriz-de-Trazabilidad.md` a documentación oficial |
| **Fuente** | `audit/raw/A..F` (evidencia citada) + código `src/` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | Catálogo de Reglas, Modelo de Dominio, Catálogo de Casos de Uso (transversal) |
| **Código usado** | `src/api`, `src/apps/*`, `src/admin`, `src/packages/core` |
| **Nivel de confianza** | Alto (estático) |

> **Cadena:** Regla → Caso de uso → Entidad → Servicio → Endpoint → Pantalla → Prueba → Manual.
> **Estado:** ✅ completa · ⚠️ parcial · ✗ rota. Cada "✗" tiene un hallazgo en el [Registro de Hallazgos](Registro-de-Hallazgos.md). Los IDs `RN-*`/`UC-*` remiten a los catálogos maestros.

## Reglas ↔ implementación ↔ prueba

| Regla | Caso | Entidad | Servicio | Endpoint | Pantalla | Prueba | Manual | Cadena | Hallazgo |
|---|---|---|---|---|---|---|---|---|---|
| RN-13 puja `>current` | UC-05 | Bid,Auction | `bid-validation.ts:35` | `POST /auctions/:id/bids` | ✅ | core 6 + e2e 7 | Comprador | ✅ | AUD-002 corregido |
| RN-14 incremento mín. | UC-05 | Bid | `bids.service.ts:92-98` | (mismo) | ✅ | unit | ✅ | ✅ | AUD-009 corregido |
| RN-15 no-auto-puja | UC-05 | Bid,User | `bids.service.ts:85` | `POST /auctions/:id/bids` | ✅ | core 6 | Comprador | ✅ | AUD-002 corregido |
| RN-17 soft-close | UC-06 | Auction | `bids.service.ts:100` | (WS `auction:extended`) | ✅ | scheduler 3 | Comprador | ✅ | AUD-002 corregido · AUD-006 corregido (PT-191) |
| RN-22 hold fondos | UC-05 | Wallet,Ledger | `wallet.service.ts:164` | (interno) | Wallet | prod 8 + core 12 | Wallet | ✅ | AUD-013 corregido |
| RN-30 cierre+captura | UC-06 | Auction,Order,Wallet | `auction-scheduler.service.ts:127` | cron | Ganadas | scheduler 3 | Comprador | ✅ | AUD-012 corregido (ADR-033) |
| RN-31 comisión | UC-21 | Wallet,CommissionRecord | `resolveRatePercent` (fuente única) | `admin/commissions` | Admin | unit | Admin | ✅ | AUD-005 corregido |
| RN-24 depósito | UC-08 | Wallet,Payment | `wallet.controller.ts:96` | `POST /wallet/deposit` | Depósito | prod 5 + e2e | Wallet | ✅ | AUD-003 corregido |
| RN-25 retiro | UC-09 | Wallet | `wallet.controller.ts:126` | `POST /wallet/withdraw` | Retiro | prod 5 | Wallet | ✅ | AUD-003 corregido |
| RN-50 webhook HMAC | UC-17 | Payment,Wallet | `mercadopago.provider.ts:137` | `POST /payments/webhook/:p` | N/A | core 7+11; prod 6 | DevOps | ✅ | AUD-023 corregido |
| RN-40 disputa 14d | UC-16 | Dispute,Order | `disputes.service.ts:55` | `POST /disputes` | Crear disputa | core 7 + prod 7 | Comprador | ✅ | AUD-003 corregido |
| RN-41 resol. disputa | UC-19 | Dispute,Refund,Wallet | `admin.service.ts:868` | `POST /admin/disputes/:id/resolve-*` | Admin | resolver-mueve-dinero 12 | Admin | ✅ | AUD-010 corregido (PT-191) |
| RN-42 reembolso | UC-20 | Refund,Order,Wallet | `refunds.service.ts:19` | `POST /admin/refunds` | Admin | refunds 5 + resolver-mueve-dinero 12 | Admin | ✅ | AUD-012/013 corregidos |
| RN-43 rating | UC-15 | Rating,Order,Shipment | `ratings.service.ts:40` | `POST /ratings` | Reputación | prod 6 + e2e 6 | Comprador | ✅ | — |
| RN-27 moneda MXN | — | Payment,Wallet | `schema.prisma` | N/A | N/A | `Decimal` en todas las rutas de dinero | — | ✅ | AUD-008 corregido · **AUD-012 corregido**: `Money` retirado en PT-191, su aritmética era peor que la que ya se usa |
| RN-03/04 gates login | UC-02 | User,Session | `auth.service.ts:636` | `POST /auth/login` | Login | prod 9 + e2e 8 | Usuario | ✅ | — |
| RN-26 ledger inmut. | UC-10 | Ledger | `wallet.service.ts` | `GET /wallet/history` | Historial | prod 8 | Wallet | ✅ | AUD-018 |

## Entidad ↔ migración ↔ documentación

| Grupo | schema.prisma | Migración | Doc BD | Estado |
|---|:--:|:--:|:--:|---|
| Núcleo (User…Ledger + observabilidad) | ✅ | ✅ | ✅ | ✅ |
| Backoffice (11 modelos) | ✅ | ✅ | parcial | ✅ AUD-001 corregido |
| UserPaymentMethod | ✅ | ✅ | ✗ | ✗ AUD-019 |
| Enum SUSPENDED/PENDING_MODERATION/HEY_BANCO | ✅ | ✅ | parcial | ✅ AUD-001 corregido · AUD-023 corregido |

## Eslabones rotos (resumen)

| Cadena | Eslabón faltante | Hallazgo |
|---|---|---|
| Puja → Pantalla | Sin página de puja ni cliente WS | AUD-002 |
| Incremento → Servicio | Config no leída por validación | AUD-009 |
| Escrituras CLIENT → Auth | Sin proxy BFF; API sólo Bearer | AUD-003 |
| Comisión → Regla única | Doble mecanismo | AUD-005 |
| ~~Disputa → Dinero~~ | resuelto: la resolución reembolsa y carga al vendedor | AUD-010 corregido (PT-191) |
| Reembolso/Comisión → Prueba | 0 tests producción | AUD-013 |
| ~~Use-cases core → Producción~~ | resuelto: retirados por ADR-033. Lo que queda son 24 símbolos huérfanos, contados en `TD-024` | AUD-012 corregido (PT-191) |
| Backoffice → Migración | 11 tablas sin migración | AUD-001 |
| CFDI → Implementación | Lanza NotImplemented | AUD-016 |
| Moneda MXN → Default BD pagos | default `USD` | AUD-008 |

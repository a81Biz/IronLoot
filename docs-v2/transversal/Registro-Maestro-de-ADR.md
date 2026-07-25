# Registro Maestro de ADR — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción documental (no existía un registro ADR; sólo el Delta Log de 11-Conventions y los `changes/*/design.md`) — hallazgo relacionado AUD (falta de trail ADR) |
| **Fuente** | `06-Backend`, `09-Security`, `11-Conventions`, `03-TRD`, `changes/*/design.md`, código |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 03-TRD, 06-Backend, 09-Security, 11-Conventions, CHANGELOG |
| **Código usado** | `src/api`, `src/apps/*`, `docker-compose.yml`, `prisma/` |
| **Nivel de confianza** | Alto (decisiones observadas en código); *Rationale* histórico marcado Medio donde procede |

> Decisiones arquitectónicas **vigentes**, reconstruidas desde el código y la doc. Estado: **Aceptada** (en vigor) salvo indicación. Las decisiones con conflicto respecto a su implementación enlazan a un hallazgo.

| ADR | Decisión | Estado | Rationale / Consecuencia | Evidencia | Hallazgo |
|---|---|---|---|---|---|
| ADR-001 | **Monorepo multi-servicio** (api, base, client, admin, core) bajo `src/` | Aceptada | Aísla superficies pública/privada/admin; core comparte dominio sin HTTP/DB. Versionado no unificado. | CLAUDE.md, `E §6` | AUD-034 |
| ADR-002 | **NestJS + SSR Nunjucks** para los 3 frontends (sin framework SPA) | Aceptada | JS vanilla inline; no hay `public/js/pages/` como decía la convención. | `D §3` | AUD-030 |
| ADR-003 | **Patrón BFF**: JWT en cookie HttpOnly, proxy server-side inyecta `Authorization` | Aceptada (parcial) | Correcto en BASE; CLIENT carece de proxy para escrituras client-side. | `base/src/main.ts:73` | AUD-003 |
| ADR-004 | **JWT Bearer** como único mecanismo de auth del API (no cookies en API) | Aceptada | El API sólo lee `Authorization`. CLIENT revalida el JWT localmente con secreto compartido. | `jwt.strategy.ts:20` | AUD-026 |
| ADR-005 | **Admin con auth de sesión** server-side (Redis) + JWT/API-key de servicio hacia el API | Aceptada | Superficie separada; pero sin CSP/CSRF y con credenciales por defecto. | `admin/src/main.ts` | AUD-004, AUD-007 |
| ADR-006 | **Prisma + PostgreSQL**; migraciones versionadas | Aceptada (violada) | Se usó `db push` para el backoffice → 46% de modelos sin migración. | `C §5` | AUD-001 |
| ADR-007 | **Moneda única MXN**, `Decimal` no `Float` | Aceptada (parcial) | `payments.currency` default DB sigue `USD`; `Money` VO no usado. | `schema.prisma:304` | AUD-008, AUD-012 |
| ADR-008 | **Dominio en @ironloot/core** (FSM, validadores, VO, use-cases) framework-free | Aceptada (parcial) | Las FSM/validadores se reusan; los 4 use-cases y `Money` **no** se cablean. | `F §2` | AUD-012 |
| ADR-009 | **Cierre de subasta por cron con lock Redis distribuido** | Aceptada | Evita doble-procesamiento multi-instancia; captura y libera fondos en una TX. | `auction-scheduler.service.ts:45` | — |
| ADR-010 | **Soft-close configurable** (`AUCTION_SOFT_CLOSE_WINDOW_SEC`) | Aceptada | Anti-sniping; extiende `endsAt` en la ventana. | `bids.service.ts:100` | — |
| ADR-011 | **Config de negocio en SystemConfig** (seed desde env, override runtime en Admin) | Aceptada | Soft-close, moderación, incremento, KYC, verificación email. Nota: incremento no aplicado. | `system-config.service.ts` | AUD-009 |
| ADR-012 | **Webhooks con validación de firma** (HMAC/IPN) antes de procesar | Aceptada | Nunca confiar en payload sin validar; rechaza si falta secreto. | `mercadopago.provider.ts:137` | — |
| ADR-013 | **Multi-proveedor de pago** (MercadoPago, PayPal, +HeyBanco, Stripe condicional) | Aceptada | HeyBanco no documentado; sólo MP+PayPal siempre activos. | `payments.service.ts:192` | AUD-023 |
| ADR-014 | **Ledger inmutable** append-only, correcciones vía ADJUSTMENT | Aceptada | Integridad financiera auditable. Retención de audit en conflicto. | `11-Conventions RULE-05` | AUD-018 |
| ADR-015 | **Real-time con Socket.io** (namespaces `auctions`/`events`) | Aceptada (incompleta) | Gateways sin auth; sin cliente WS en el frontend. | `auctions.gateway.ts` | AUD-002, AUD-006 |
| ADR-016 | **nginx como reverse proxy** por subdominio + traffic-switch en `ironloot.local` | Aceptada | Enruta base/api/admin/client; 301 por ruta en host bare. | `src/nginx/nginx.conf` | — |
| ADR-017 | **Rate limiting con @nestjs/throttler** (100/min global, estricto en auth/wallet/webhook) | Aceptada | Login admin queda `@SkipThrottle`. | `09-Security §7` | AUD-004 |
| ADR-018 | **Log de auditoría inmutable** (AuditEvent/ErrorEvent/RequestLog) con `traceId` | Aceptada | Observabilidad; retención vía cron (en conflicto). | `schema.prisma:460` | AUD-018 |
| ADR-019 | **Payout del vendedor manual detrás de `PayoutProvider`** (MVP `ManualPayoutProvider`; dispersión automática = Fase 2) | Aceptada | El banco ofrece cobros pero no dispersiones automáticas; se abstrae el mecanismo para enchufar SPEI/MP disbursement sin tocar la máquina de estados. El admin ejecuta la transferencia y marca PAID. | `wallet/payout/payout-provider.ts`, `withdrawals.service.ts` | PT-072 (RN-67) |
| ADR-020 | **Retención de liquidación (holdback) en `pendingBalance`**, liberada por entrega **o** vencimiento de disputa | Aceptada | Protege reembolsos/disputas: el neto de venta no es retirable hasta DELIVERED o `createdAt + DISPUTE_WINDOW_DAYS(14)`. Cron `EVERY_30_MINUTES` + asiento `SETTLEMENT_RELEASE`. | `wallet.service.ts`, `auction-scheduler.releaseMaturedSettlements` | PT-071 (RN-64) |
| ADR-021 | **KYC obligatorio** como puerta para vender y retirar | Aceptada | Cumplimiento AML/identidad: `enableSeller` y `withdrawals.request` exigen KYC APPROVED. Aprobación admin. Cierra OBS-01. | `kyc.service.ts`, `users.service.ts`, `withdrawals.service.ts` | PT-069 (RN-62) |
| ADR-022 | **Retiro con aprobación manual del admin** (REQUESTED→APPROVED→PAID/REJECTED), reserva de fondos al solicitar | Aceptada | Control antifraude antes de dispersar; el rechazo reintegra vía `ADJUSTMENT`. El viejo `/wallet/withdraw` inmediato delega ahora en la solicitud. | `withdrawals.service.ts`, `admin.controller.ts` | PT-072 (RN-65, RN-66) |

> **Deuda ADR:** decisiones sobre CSRF (ADR pendiente — postura contradictoria AUD-014) y sobre el mecanismo único de comisión (AUD-005) deben formalizarse como ADR nuevas cuando se resuelvan bajo FDGE.

# Diccionario Maestro — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción documental (consolida glosarios dispersos, hallazgo AUD-029) |
| **Fuente** | `audit/raw/A..F`, `docs/enterprise-documentation/*`, `docs/design/*`, código `src/` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 01-Platform-Overview, 05-UIUX, 06-Backend, 07-Database, 09-Security, Modo_Luz/Oscuro |
| **Código usado** | `src/api`, `src/packages/core`, `prisma/schema.prisma` |
| **Nivel de confianza** | Alto |

> Fuente única de términos. Antes esta información estaba dispersa en ≥4 documentos sin un glosario único (AUD-029). Los términos de metodología (PT-XXX, FDGE, PTSA, D1–D5) viven en `docs/methodology/` y no se repiten aquí.

## A. Términos de negocio y dominio

| Término | Definición | Evidencia |
|---|---|---|
| **Subasta (Auction)** | Lote publicado por un vendedor con precio inicial, ventana temporal y ciclo de vida DRAFT→PUBLISHED→ACTIVE→CLOSED. | `schema.prisma:160`, `auction-state-machine.ts:10` |
| **Puja (Bid)** | Oferta de un comprador sobre una subasta activa; debe superar el precio actual y bloquea fondos de su wallet. | `bid-validation.ts:16`, `bids.service.ts:71` |
| **Soft-close** | Ventana final (por defecto 120s) en la que una puja extiende `endsAt` para evitar sniping. Es lógica del scheduler/pujas, **no** un estado de BD. | `bids.service.ts:100`, `AUCTION_SOFT_CLOSE_WINDOW_SEC` |
| **Wallet (Monedero)** | Saldo del usuario: `balance` (disponible) + `heldFunds` (retenido por pujas activas). Requiere depósito inicial para activarse. | `schema.prisma:618-639` |
| **Held funds (Fondos retenidos)** | Fondos bloqueados por pujas activas. Tras bloquear, **pueden** exceder el balance restante (invariante corregida en PT-032). | `wallet-calculation.ts:9`, `02-PRD AC-3.2` |
| **Ledger (Libro mayor)** | Historial financiero inmutable, sólo-inserción; correcciones vía asiento `ADJUSTMENT`. | `schema.prisma:642`, `11-Conventions RULE-05` |
| **Orden (Order)** | Registro post-subasta (1:1 con subasta) que rige pago→envío→entrega. | `schema.prisma:249` |
| **Comisión de plataforma** | Tarifa cobrada al vendedor. **Estado real:** dos mecanismos coexisten — 10% fijo en captura y `CommissionsService` configurable no cableado (AUD-005). | `wallet.service.ts:285`, `commissions.service.ts:46` |
| **Disputa (Dispute)** | Conflicto post-entrega abierto dentro de 14 días; ciclo OPEN→IN_MEDIATION→RESOLVED→CLOSED. | `dispute-state-machine.ts:5` |
| **Reembolso (Refund)** | Crédito al comprador que marca la orden REFUNDED. | `refunds.service.ts:19` |
| **Calificación (Rating)** | Reputación 1–5 tras entrega (envío DELIVERED). | `ratings.service.ts:40` |
| **KYC** | Verificación de identidad para habilitar vendedor; revisión manual admin (no hay proveedor externo). | `kyc.service.ts`, `REQUIRE_KYC_FOR_SELLERS` |
| **CFDI** | Factura fiscal mexicana. **Estado real:** no funcional (stub que lanza NotImplemented, AUD-016). | `cfdi.service.ts:33` |
| **Producto (PTSA)** | Concepto de auditoría: salida semántica auditable (P-001..P-012). No es una entidad de BD. | PTSA `F-1 §3` |

## B. Términos técnicos / arquitectura

| Término | Definición | Evidencia |
|---|---|---|
| **BFF (Backend for Frontend)** | Patrón donde el sitio SSR guarda el JWT en cookie HttpOnly y proxya las llamadas al API inyectando `Authorization` server-side. **Estado real:** correcto en BASE; roto para las escrituras client-side de CLIENT (AUD-003). | `base/src/main.ts:73-120` |
| **@ironloot/core** | Librería de dominio compartida (sin HTTP/DB/NestJS): máquinas de estado, validadores, value objects, casos de uso. | `packages/core/`, `06-Backend §7` |
| **Money (value object)** | VO de dinero en centavos enteros, currency-safe. **Estado real:** definido y probado en core pero **no usado** por el API (usa `Decimal`, AUD-012). | `money.ts:22`, `F §2.7` |
| **Máquina de estados (FSM)** | Matriz de transiciones válidas por entidad (auction/order/dispute) en core. **Estado real:** admin las salta con `prisma.update` (AUD-011). | `*-state-machine.ts` |
| **Distributed lock** | Cerrojo Redis (`lock:auction-close`, TTL 60s) que evita procesar un cierre en múltiples instancias. | `auction-scheduler.service.ts:45` |
| **Scheduler** | Cron cada minuto que activa subastas programadas y cierra las expiradas. | `auction-scheduler.service.ts:36` |
| **Webhook: validación de firma** | Comprobación de autenticidad del webhook antes de procesarlo: MercadoPago y HeyBanco por HMAC; PayPal por `POST /v1/notifications/verify-webhook-signature` (Orders v2, PT-076 — antes IPN). | `mercadopago.provider.ts:137` |
| **AdminDualAuthGuard** | Guard que acepta JWT admin **o** `x-admin-key`. | `admin-dual-auth.guard.ts` |
| **AuditEvent** | Log de eventos inmutable append-only. **Estado real:** dos crons con retención en conflicto (90d/30d, AUD-018). | `schema.prisma:460` |

## C. Servicios / despliegue

| Término | Definición | Evidencia |
|---|---|---|
| **BASE** | Sitio público SSR (puerto 5174, `base.ironloot.local`): home, catálogo, auth. | `docker-compose.yml:228`, CLAUDE.md |
| **CLIENT** | Portal privado SSR (5175, `client.ironloot.local`): dashboard, wallet, órdenes, vendedor. | `docker-compose.yml:271` |
| **API** | Backend REST + WebSockets NestJS (3000). Prefijo global `/api/v1`. | `main.ts:89-95` |
| **ADMIN** | Backoffice NestJS (3001, `admin.ironloot.local`), sesión server-side Redis. | `src/admin`, `docker-compose.yml:34` |
| **nginx** | Reverse proxy que enruta por subdominio y hace traffic-switch en `ironloot.local`. | `src/nginx/nginx.conf` |
| **HeyBanco** | Tercer proveedor de pago presente en código, **no documentado** antes (AUD-023). | `heybanco.provider.ts` |

## D. Marca / diseño

| Término | Definición | Evidencia |
|---|---|---|
| **Iron Black / Gunmetal / Gold** | Paleta de marca: `#151515` / `#31363F` / `#C89B3C` sobre `#F6F6F6`. | `docs/design/Modo_Luz.md` |
| **Isotipo / bóveda** | Símbolo de marca (I + bóveda/candado). Variación menor entre modo luz/oscuro (AUD-008 cosmético). | `Modo_Luz.md:59`, `Modo_Oscuro.md:34` |

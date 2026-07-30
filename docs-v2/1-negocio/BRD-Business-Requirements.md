# BRD — Business Requirements Document — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción documental basada en evidencia |
| **Fuente** | `audit/raw/B/C/D/E`, `01-Platform-Overview`, `02-PRD`, `docker-compose.yml`, `schema.prisma`, código de dominio |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 01-Platform-Overview, 02-PRD, 03-TRD, README, CHANGELOG |
| **Código usado** | `src/api/src/modules/*`, `src/apps/*`, `src/admin`, `prisma/schema.prisma` |
| **Nivel de confianza** | Alto para *qué hace* el sistema; **Medio** para *intención de negocio* (inferida de la implementación, marcada donde aplica) |

> Nota de método: IronLoot no traía un BRD. Este documento **infiere** los requisitos de negocio a partir de lo que el sistema implementa. Las afirmaciones de *intención* (objetivos comerciales, mercado) se marcan **[inferido]**; las de *capacidad* están respaldadas por código.

## 1. Contexto y propósito del negocio

IronLoot es una **plataforma de subastas en línea** que conecta vendedores y compradores para transaccionar lotes mediante puja competitiva, con liquidación financiera interna (monedero), procesamiento de pagos y resolución de conflictos. `[inferido del dominio: `schema.prisma` Auction/Bid/Order/Wallet/Dispute]`

- **Mercado objetivo:** México **[inferido]** — evidenciado por moneda MXN global (`RN-27`), integración fiscal CFDI (`cfdi/`), proveedores de pago locales (Mercado Pago, HeyBanco) y campos fiscales RFC (`profiles.rfc`).
- **Modelo de ingresos:** comisión de plataforma sobre ventas (`RN-31`, `wallet.service.ts:285` / `commissions.service.ts`). Es la fuente de ingreso principal identificable en el código.

## 2. Necesidades de negocio (BR)

| ID | Necesidad de negocio | Capacidad que la satisface | Evidencia |
|---|---|---|---|
| BR-01 | Permitir a vendedores publicar lotes y subastarlos con puja competitiva. | Módulo auctions + bids; ciclo DRAFT→…→CLOSED. | `auctions/`, `bids/` |
| BR-02 | Garantizar solvencia del comprador antes de adjudicar (evitar pujas sin fondos). | Wallet con bloqueo de fondos hold-first. | `RN-22`, `wallet.service.ts:164` |
| BR-03 | Cobrar y liquidar automáticamente al cierre (ganador paga, perdedores liberan). | Scheduler de cierre con captura y liberación en TX. | `RN-30`, `auction-scheduler.service.ts:127` |
| BR-04 | Monetizar vía comisión configurable por vendedor/global. | CommissionsService (configurable). **Estado real: doble mecanismo.** | `RN-31`, **AUD-005** |
| BR-05 | Aceptar depósitos por múltiples pasarelas de pago. | Mercado Pago, PayPal, HeyBanco. | `payments/providers/*`, **AUD-023** |
| BR-06 | Cumplir obligaciones fiscales mexicanas (facturación CFDI). | Módulo cfdi. **Estado real: no funcional (stub).** | **AUD-016** |
| BR-07 | Gestionar el cumplimiento post-venta (envío, entrega, reputación). **La recepción la confirma quien recibe**: el vendedor declara el envío, el comprador —y sólo él— confirma la entrega, y el neto de la venta espera 72 h desde esa confirmación. | orders/shipments/ratings. | `RN-34`, `RN-43`, **`RN-64`/`RN-64b`** |
| BR-08 | Resolver conflictos comprador↔vendedor con ventana acotada. | disputes (14 días) + resolución admin. **Estado real: resolución no mueve dinero.** | `RN-40`, **AUD-010** |
| BR-09 | Verificar identidad de vendedores (anti-fraude). | KYC (revisión manual admin). | `kyc/`, `REQUIRE_KYC_FOR_SELLERS` |
| BR-10 | Operar el negocio desde un backoffice (moderación, finanzas, config). | App ADMIN, 18 módulos. | `src/admin` |
| BR-11 | Trazabilidad financiera auditable e inmutable. | Ledger append-only + AuditEvent. | `RN-26`, `ADR-014` |
| BR-12 | Seguridad de cuentas y fondos. | JWT+2FA, rate limiting, validación de webhooks. | `RN-01..07`, `RN-50..52` |

## 3. Restricciones de negocio

| ID | Restricción | Evidencia |
|---|---|---|
| BC-01 | **Moneda única MXN.** Toda la operación financiera es en pesos mexicanos. | `RN-27`; `AUD-008` **corregido** — la base dice `MXN` en las cinco tablas con `currency` |
| BC-02 | **Cumplimiento fiscal mexicano (CFDI/PAC)** requerido para operar comercialmente de forma legal. | `AUD-016` (bloqueante) |
| BC-03 | **KYC obligatorio para vendedores** (configurable). | `REQUIRE_KYC_FOR_SELLERS=true` |
| BC-04 | **Límite de retiro diario 5.000 MXN.** | `RN-25` |
| BC-05 | **Ventana de disputa 14 días** post-entrega. | `RN-40` |
| BC-06 | **Verificación de email obligatoria** para activar cuenta. | `RN-03`, `REQUIRE_EMAIL_VERIFICATION=true` |

## 4. Supuestos y dependencias

- Dependencia de terceros: Mercado Pago, PayPal, HeyBanco (pagos), un PAC para CFDI **(no seleccionado, `AUD-016`)**, proveedor SMTP (email), Redis y PostgreSQL (infraestructura).
- Supuesto operativo: la moderación de subastas es **opcional** por configuración (`REQUIRE_AUCTION_MODERATION`, default `false`).

## 5. Criterios de éxito de negocio (alto nivel)

Ver KPIs medibles en [Objetivos-Alcance-Stakeholders-KPIs.md](Objetivos-Alcance-Stakeholders-KPIs.md). En síntesis: volumen de subastas cerradas con éxito, ingreso por comisión, tasa de disputa, y solvencia del ledger (cuadre financiero).

> **Riesgo de negocio prioritario:** dos capacidades centrales del modelo no son plenamente operables hoy — la **puja desde la UI** (`AUD-002`) y la **facturación fiscal** (`AUD-016`) — lo que limita la operación comercial real. Ver [Roadmap-y-Riesgos.md](Roadmap-y-Riesgos.md).

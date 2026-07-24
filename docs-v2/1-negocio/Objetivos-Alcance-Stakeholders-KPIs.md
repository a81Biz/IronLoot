# Objetivos, Alcance, Stakeholders, KPIs y Restricciones — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia |
| **Fuente** | `audit/raw/B/D/E`, código de `admin` (reportes/dashboard), `docker-compose.yml`, `.env.example` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 01-Platform-Overview, 03-TRD |
| **Código usado** | `admin.controller.ts` (reports/dashboard), `commissions.service.ts`, `wallet.service.ts` |
| **Nivel de confianza** | Alto para KPIs *medibles por el sistema*; **Medio** para objetivos estratégicos (inferidos) |

## 1. Objetivos estratégicos [inferidos de la implementación]

| ID | Objetivo | Sustento en el sistema |
|---|---|---|
| OE-01 | Operar un mercado de subastas confiable con liquidación financiera interna. | Wallet + Ledger + captura automática al cierre. |
| OE-02 | Monetizar mediante comisión sobre ventas. | `CommissionsService`, fee de captura. |
| OE-03 | Cumplir el marco fiscal mexicano (CFDI). | Módulo cfdi + config PAC (pendiente, `AUD-016`). |
| OE-04 | Minimizar fraude y riesgo financiero. | KYC, 2FA, validación de webhooks, bloqueo de fondos. |
| OE-05 | Operar el negocio con un backoffice completo. | App ADMIN (18 módulos). |

## 2. Alcance

**Dentro de alcance (implementado):**
- Cuentas, catálogo, puja (backend), monedero, cierre/orden, envío/entrega, calificación, disputa (apertura), backoffice, pagos multi-proveedor, observabilidad.

**Dentro de alcance pero incompleto (ver hallazgos):**
- UI de puja (`AUD-002`), escrituras autenticadas en CLIENT (`AUD-003`), comisión unificada (`AUD-005`), reembolso vía disputa (`AUD-010`), CFDI (`AUD-016`).

**Fuera de alcance:** multi-moneda, tracking de transportista en vivo, SPA frontend, roles admin granulares. (Ver PRD §4.)

## 3. Stakeholders

| Stakeholder | Interés | Interacción con el sistema |
|---|---|---|
| **Comprador** | Pujar y ganar lotes de forma segura. | BASE (catálogo) + CLIENT (puja*, wallet, órdenes). |
| **Vendedor** | Vender lotes y cobrar. | CLIENT (publicar, órdenes) + KYC. |
| **Administrador / Operaciones** | Moderar, resolver disputas, configurar. | ADMIN. |
| **Finanzas** | Comisiones, reconciliación, reportes fiscales. | ADMIN (financial/commissions/reports/cfdi). |
| **Proveedores de pago** | Mercado Pago, PayPal, HeyBanco. | Webhooks + checkout. |
| **PAC (timbrado fiscal)** | Emisión CFDI. | Pendiente de selección (`AUD-016`). |
| **Equipo de Ingeniería/DevOps** | Operar y evolucionar la plataforma. | Repo, CI, Docker. |

## 4. KPIs (medibles por el sistema)

Derivados de lo que el backoffice **efectivamente mide** (`admin.controller.ts` dashboard/reports):

| KPI | Definición | Fuente en código |
|---|---|---|
| **Ingresos por comisión** | Suma de `CommissionRecord.amount` (o fee de captura). | `admin.controller.ts:218-258`, `reports/financial:267` |
| **Ingresos por día** | Serie temporal de ventas. | `dashboard/revenue-by-day:59` |
| **Altas de usuarios por día** | Serie temporal de registros. | `dashboard/users-by-day:65` |
| **Subastas cerradas con ganador** | Órdenes creadas al cierre. | `auction-scheduler.service.ts:127` |
| **Tasa de disputa** | Disputas / órdenes entregadas. | `disputes/`, `admin reports/operational:290` |
| **Cuadre del ledger** | Consistencia balance+held vs asientos. | `wallet`/`ledger`; reconciliación (`AUD-016` parcial) |
| **KPIs fiscales** | Reporte fiscal (CFDI emitidos). | `reports/fiscal:311` — limitado por `AUD-016` |
| **Métricas operativas/errores** | Diagnostics + observabilidad. | `diagnostics/`, `AuditEvent`/`ErrorEvent` |

> **Nota:** varios KPIs (fiscales, comisión real, cuadre) están **limitados por hallazgos** (AUD-005, AUD-016). Los reportes existen pero pueden no reflejar la operación real hasta resolverse.

## 5. Restricciones (negocio + técnicas)

| ID | Restricción | Tipo | Evidencia |
|---|---|---|---|
| RC-01 | Moneda única MXN. | Negocio | `RN-27` |
| RC-02 | CFDI requerido para operación fiscal legal. | Legal | `AUD-016` |
| RC-03 | KYC obligatorio para vender (configurable). | Negocio | `REQUIRE_KYC_FOR_SELLERS` |
| RC-04 | Retiro ≤ 5.000 MXN/día. | Negocio | `RN-25` |
| RC-05 | Ventana de disputa 14 días. | Negocio | `RN-40` |
| RC-06 | En producción, secretos no placeholder o el arranque falla. | Técnica/Seguridad | `RN-53` (parcial, `AUD-004`) |
| RC-07 | `ALLOWED_ORIGINS` no vacío en prod (CORS). | Técnica | `.env.example:64` |
| RC-08 | Cookie cross-subdominio requiere dominio con punto (`.ironloot.local`). | Técnica | `.env.example:72` |

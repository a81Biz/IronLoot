---
ptsa_version: 3.0
fase: F3
nombre: Identificación de Productos
estado: COMPLETADA
ultima_actualizacion: 2026-06-23
confidence: 92
sesion: S-001
---

# F3 — Identificación de Productos

**Sistema:** IronLoot v1.0.0  
**Fecha:** 2026-06-23  
**Fuente:** `docs/enterprise-documentation/02-PRD.md`, `src/api/prisma/schema.prisma`, `src/api/src/modules/**`, F-1

---

## 1. Metodología de identificación

Para un sistema transaccional como IronLoot, los "productos" son los **resultados consumibles** que el sistema produce para actores (usuarios finales o sistemas externos). Se identifican mediante la pregunta:

> "¿Qué produce el sistema que un actor consume directamente?"

**No** son productos: tablas de BD (son fuentes de datos), servicios (son transformaciones), logs (son artefactos internos).

**Sí** son productos: la subasta cerrada con ganador identificado, el pago confirmado, la notificación entregada, el token JWT válido, etc.

---

## 2. Catálogo de Productos

### Productos Primarios (consumidos directamente por usuarios/sistemas externos)

| ID | Nombre | Consumidor | Transformación principal | Dimensión primaria |
|:---|:---|:---|:---|:---|
| **P-001** | Bid — Puja colocada | Comprador (+ sistema real-time) | `BidsService.placeBid()` | D1 |
| **P-002** | Auction Close — Cierre de subasta | Sistema/Comprador/Vendedor | `AuctionSchedulerService` | D1 |
| **P-003** | Order — Pedido creado | Comprador / Vendedor | `OrdersService.create()` | D1 |
| **P-004** | Payment — Pago procesado | Comprador | `PaymentsService.handleWebhook()` | D1 |
| **P-005** | Wallet Transaction — Transacción de monedero | Comprador/Vendedor | `WalletService.deposit/withdraw/hold/release()` | D1 |
| **P-006** | Dispute — Disputa gestionada | Comprador | `DisputesService.create()` | D1 |
| **P-007** | Notification — Notificación entregada | Comprador/Vendedor | `NotificationsService.send()` | D3 |
| **P-008** | JWT Auth Token — Token de acceso | Todos los usuarios | `AuthService.login()` / `refresh()` | D2 |
| **P-011** | KYC Submission — Verificación de vendedor | Vendedor | `KycService.submit()` | D1 |

### Productos Secundarios (alimentan a primarios)

| ID | Nombre | Alimenta a | Transformación | Dimensión primaria |
|:---|:---|:---|:---|:---|
| **P-009** | Ledger Entry — Entrada de ledger | P-005 Wallet Transaction | `WalletService` → `prisma.ledger.create()` | D1 |
| **P-010** | Commission Record — Registro de comisión | P-003 Order | `CommissionsService.record()` | D1 |
| **P-012** | CFDI Record — Registro fiscal | P-003 Order | `CfdiService` (STUB) | D1 |

---

## 3. Exclusiones justificadas

| Elemento | Razón de exclusión |
|:---|:---|
| AuditEvent / ErrorEvent / RequestLog | Artefactos internos de observabilidad — no son producto consumible |
| Sessions (JWT refresh tokens) | Artefacto interno de infraestructura auth |
| SystemConfig | Configuración interna, no consumida por usuarios finales |
| NotificationCampaign | Artefacto de admin, no producto final del usuario |
| ModerationLog | Artefacto interno de moderación admin |
| SeoConfig / CmsContent | Configuración interna (afectan la presentación, no son productos per se) |

---

## 4. Acción obligatoria [R47]

Los archivos `PTSA/Productos/P-XXX.md` han sido creados con estado BORRADOR para cada producto primario y secundario:

- [x] P-001_Bid.md — BORRADOR
- [x] P-002_AuctionClose.md — BORRADOR
- [x] P-003_Order.md — BORRADOR
- [x] P-004_Payment.md — BORRADOR
- [x] P-005_WalletTransaction.md — BORRADOR
- [x] P-006_Dispute.md — BORRADOR
- [x] P-007_Notification.md — BORRADOR
- [x] P-008_JwtToken.md — BORRADOR
- [x] P-009_LedgerEntry.md — BORRADOR
- [x] P-010_CommissionRecord.md — BORRADOR
- [x] P-011_KycSubmission.md — BORRADOR
- [x] P-012_CfdiRecord.md — BORRADOR

---

## Checklist F3 ✅

- [x] `Productos/` creado
- [x] Un `P-XXX.md` por producto primario (9 archivos)
- [x] Un `P-XXX.md` por producto secundario que alimenta un primario (3 archivos)
- [x] Cada uno con `dimension_primaria` y `clase`

**Estado: COMPLETADA** | Confidence: 92%

---

## Update U-006 — S-002 (2026-07-27): sin transiciones, con una salvedad

Los 12 productos mantienen el estado que fijó DS-008: **11 `VALIDADO`**, P-012 `IDENTIFICADO`.

Ningún hallazgo de esta sesión degrada un producto. H-014, H-015 y H-016 son **sistémicos**
(`producto_id: null`, §13.7): penalizan su dimensión y no se imputan a ningún producto. Es la
lectura honesta — H-014 no dice que P-004 esté mal, dice que el artefacto que reconstruiría su base
en otro entorno está roto. La salida real de P-004 sigue siendo correcta (E-019).

### Salvedad sobre P-006 — Dispute

Llegó a `VALIDADO` en DS-008 con la evidencia E-015, observada sobre disputas reales en la base.
**Esa base se reconstruyó después**: hoy `disputes` tiene 0 filas y `_prisma_migrations` no existe
(H-014). E-015 sigue siendo una captura válida de lo que se observó; **no es reproducible hoy**.

No se degrada el estado: `[R68]` exige evidencia post-fix observada en la fuente real para *llegar*
a VALIDADO, y esa evidencia se capturó. Pero queda anotado, porque una validación que no puede
repetirse en el entorno actual no es lo mismo que una que sí. La próxima corrida completa de QA
debería volver a generar una disputa real.

### Salida real disponible hoy, por producto

| Producto | Filas | |
|---|--:|---|
| P-001 Bid | 3 | ✅ |
| P-002 AuctionClose | 1 subasta CLOSED | ✅ |
| P-003 Order | 1 | ✅ |
| P-004 Payment | 1 pago · 4 ciclos · 49 eventos de traza | ✅ |
| P-005 WalletTransaction | 4 monederos | ✅ |
| P-006 Dispute | **0** | ⚠️ base reconstruida |
| P-007 Notification | 4 (incluye `AUCTION_SOLD`) | ✅ |
| P-008 JwtToken | 25 sesiones | ✅ |
| P-009 LedgerEntry | 15 asientos, 9 tipos | ✅ |
| P-010 CommissionRecord | 1 | ✅ |
| P-011 KycSubmission | 1 APPROVED | ✅ |
| P-012 CfdiRecord | **0** | ⚠️ H-005 |

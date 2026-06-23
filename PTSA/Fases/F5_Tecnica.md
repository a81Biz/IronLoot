# F5 — Auditoría Técnica (Architectural Integrity)

**Estado**: COMPLETADA (parcial — BLQ-001 limita verificación de DB real)  
**Fecha**: 2026-06-23  
**Confidence**: 82%  
**Dimensión principal**: D2 — Architectural Integrity

---

## Alcance

F5 verifica: calidad de código, seguridad, deuda técnica, integridad de DB (schema), patrones arquitectónicos reales vs documentados.

**Limitaciones activas**:
- BLQ-001: No acceso a DB real — schema verificado via `schema.prisma` (proxy de alta fidelidad para estructura, no para datos/integridad en vivo)
- BLQ-002: No acceso a logs en vivo — logging verificado via código fuente

---

## F5.1 — Verificación de Schema (proxy via schema.prisma)

**Fuente**: `src/api/prisma/schema.prisma`

Hallazgos positivos:
- Todos los campos financieros usan `Decimal(10,2)` o `Decimal(12,2)` — no hay `Float` en columnas monetarias ✅ (CR-015)
- Claves foráneas definidas con `@relation` y cascadas explícitas ✅
- Enums para estados (`AuctionStatus`, `OrderStatus`, `DisputeStatus`, `UserState`) — type-safe ✅
- `created_at`/`updated_at` presentes en todas las entidades de negocio ✅
- `LedgerEntry` sin `updated_at` (inmutable por diseño) ✅

Limitaciones (BLQ-001):
- No se puede verificar índices en DB real (solo inferibles desde `@@index` en schema)
- No se puede verificar datos de migración o FK integrity en vivo

---

## F5.2 — Seguridad

### HMAC Webhook Validation ✅ (CR-008)
Verificado via grep en todos los providers:
- `MercadoPagoProvider`: `WebhookSignatureValidator.validateHmacSignature()` de @ironloot/core
- `HeyBancoProvider`: `createHmac` de Node.js crypto
- `PaypalProvider`: Valida IPN signature, throw si inválido

### JWT y Auth ✅ (CR-013)
- `AuthService` maneja `UserState.PENDING_VERIFICATION`, `UserState.BANNED`
- Tokens en HttpOnly cookies en SSR sites
- `RolesGuard` para endpoints admin/seller

### CORS ✅
- Configurado en PT-024 con CORS restrictivo

### CSRF ✅
- Documentado en `09-Security-Architecture.md` — double-submit cookies

### Distributed Lock ✅
- `lock:auction-close` con TTL 60s en Redis — previene doble cierre de subasta

### Anomalías de seguridad detectadas:
- **H-004**: Withdraw payment method validation comentada — MEDIA
- **H-006**: CLIENT expone `apiUrl` al browser — MEDIA (confidence parcial)

---

## F5.3 — Calidad de código y patrones

### Patrón StructuredLogger
- Implementado en `src/api/src/common/observability/`
- `BidsService`, `WalletService`, `AuthService` usan StructuredLogger ✅
- **H-003**: `PaymentsService` usa Logger estándar — excepción al patrón — BAJA

### Transacciones atómicas ✅
- `WalletService`: todas las operaciones financieras en `prisma.$transaction()` con LedgerEntry
- Verificado que no existe mutación de wallet sin ledger entry (CR-012)

### @ironloot/core como única fuente de reglas de dominio ✅
- `AuctionStateMachine`, `BidValidation`, `DisputeStateMachine`, `WalletCalculation`, `WebhookSignatureValidator`
- Importados desde servicios del API — no hay reglas duplicadas inline

### Hardcoding de configuración:
- **H-001**: `EXTENSION_MS = 5 * 60 * 1000` en BidsService — viola principio de configurabilidad

### ThrottlerModule:
- **H-002**: Sin Redis storage — limitación conocida para multi-instancia

---

## F5.4 — Deuda Técnica Catalogada

| ID | Severidad | Descripción | Estado PTSA |
|---|---|---|---|
| TD-001 | HIGH | CFDI stub | H-005 (ALTA) |
| TD-003 | MEDIUM | Withdraw payment method mock | H-004 (MEDIA) |
| ND-002 | — | ThrottlerModule in-memory | H-002 (MEDIA) |
| ND-007 | — | CLIENT apiUrl browser exposure | H-006 (MEDIA) |

---

## Hallazgos D2 identificados en F5

| Finding | Tipo | Severidad | Penalización |
|---|---|---|---|
| H-002 | OPERATIONAL | MEDIA | -5 |
| H-003 | OBSERVABILITY | BAJA | -1 |
| H-004 | SECURITY | MEDIA | -5 |
| H-006 | SECURITY | MEDIA | -5 |

**Score D2 parcial**: 100 - 5 - 1 - 5 - 5 = **84**

# F12 — Gobernanza de Dominio

**Estado**: CONFIGURADA  
**Fecha**: 2026-06-23  
**Sesión**: S-001

---

## Domain Rules as Code (CR-001 a CR-015)

Las reglas de dominio declaradas en F-1 son la fuente de verdad para todas las auditorías futuras. Esta sección las ancla en el código y establece cómo evolucionarán.

### Registro de Reglas Activas

| ID | Regla | Implementación | Verificado F6 | Estado |
|---|---|---|---|---|
| CR-001 | Balance ≥ 0 siempre | `WalletService.holdFunds()` + `InsufficientBalanceException` | ✅ | ACTIVA |
| CR-002 | Soft-close extiende por `AUCTION_SOFT_CLOSE_WINDOW_SEC` | `BidsService.EXTENSION_MS` (hardcoded 300s) | ❌ H-001 | VIOLADA |
| CR-003 | Hold funds: balance -= amount, held += amount (atómico) | `prisma.$transaction()` en WalletService | ✅ | ACTIVA |
| CR-004 | Depósito requiere payment COMPLETED + amount match | `WalletController.deposit()` | ✅ | ACTIVA |
| CR-005 | Ganador = puja más alta activa | `AuctionSchedulerService.closeAuction()` | ✅ | ACTIVA |
| CR-006 | Fondos no-ganadores liberados en cierre | `WalletService.releaseFunds()` en closeAuction | ✅ | ACTIVA |
| CR-007 | Disputa solo en ventana 14 días post-entrega | `DisputeStateMachine.windowDays` de @ironloot/core | ✅ | ACTIVA |
| CR-008 | Webhooks validados por HMAC antes de procesar | `WebhookSignatureValidator.validateHmacSignature()` | ✅ | ACTIVA |
| CR-009 | Retiro requiere método de pago registrado del usuario | `WalletController.withdraw()` (comentado — mock) | PARCIAL H-004 | PARCIAL |
| CR-010 | 2FA requerido si habilitado | `AuthService` verifica TOTP | ✅ | ACTIVA |
| CR-011 | Transacción gravable genera CfdiRecord válido | `CfdiService` (stub) | ❌ H-005 | VIOLADA |
| CR-012 | Toda mutación wallet genera LedgerEntry | `prisma.$transaction()` con LedgerEntry siempre | ✅ | ACTIVA |
| CR-013 | Usuarios BANNED no pueden autenticarse | `AuthService` state check | ✅ | ACTIVA |
| CR-014 | Límite retiro 5000 MXN/día | `WalletController.withdraw()` DAILY_LIMIT | ✅ | ACTIVA |
| CR-015 | Montos financieros en Decimal, no Float | `schema.prisma` — Decimal(10,2)/Decimal(12,2) | ✅ | ACTIVA |

**Estado global**: 12/15 activas, 2 violadas (H-001, H-005), 1 parcial (H-004)

---

## Evolución de Reglas de Dominio

### Protocolo para añadir reglas de negocio nuevas

1. Documentar la nueva CR en `PTSA/Fases/F-1_Declaracion_Valor.md` (sección Domain Rules)
2. Implementar en `@ironloot/core` si es una regla de dominio pura (sin dependencias NestJS/DB)
3. Importar desde el servicio correspondiente — nunca duplicar la regla inline
4. Crear test unitario en `@ironloot/core` que verifique la invariante
5. Registrar aquí en F12 con estado ACTIVA

### Protocolo para cambiar una regla existente

1. Abrir PT en FDGE como FEATURE o BUG según corresponda
2. Actualizar la CR en F-1 con la nueva definición
3. Actualizar `@ironloot/core` si la regla vive ahí
4. Activar delta sync PTSA para re-verificar el finding asociado
5. Actualizar F12 con nuevo estado

---

## Reglas como Código — Ubicaciones Canónicas

| Regla | Archivo canónico | Tests |
|---|---|---|
| CR-001, CR-003 | `src/packages/core/src/wallet/WalletCalculation.ts` | `src/packages/core/src/wallet/*.spec.ts` |
| CR-002 | `src/api/src/modules/bids/bids.service.ts` (PENDIENTE CORRECCIÓN H-001) | — |
| CR-005, CR-006 | `src/api/src/modules/scheduler/auction-scheduler.service.ts` | — |
| CR-007 | `src/packages/core/src/disputes/DisputeStateMachine.ts` | `src/packages/core/src/disputes/*.spec.ts` |
| CR-008 | `src/packages/core/src/payments/WebhookSignatureValidator.ts` | `src/packages/core/src/payments/*.spec.ts` |
| CR-011 | `src/api/src/modules/cfdi/cfdi.service.ts` (STUB — PENDIENTE H-005) | — |
| CR-015 | `src/api/prisma/schema.prisma` | Verificación estructural |

---

## Hallazgos de Dominio Activos (CR violadas)

Los siguientes hallazgos representan reglas de negocio no cumplidas y requieren intervención antes de que PTSA pueda certificar D1 ≥ 80:

| Hallazgo | CR violada | Esfuerzo estimado | Impacto en D1 |
|---|---|---|---|
| H-001 | CR-002 | S (1-2 horas) | +15 pts |
| H-005 | CR-011 | XL (sprint completo + contrato PAC) | +15 pts |

**D1 proyectado post-corrección ambos**: 70 + 15 + 15 = 100

---

## Comité de Dominio

**Responsable de dominio**: Alberto Martínez (solo desarrollador activo — 2026-06-23)  
**Auditor PTSA**: Claude Code — PTSA V3  
**Próxima revisión de Domain Rules**: 2026-07-23 o antes si se implementa H-001

---

## F12 — Cierre

Con F12 completada, el loop completo F-1 → F0 → F1 → F2 → F3 → F3.5 → F4 → F5 → F6 → F7 → F8 → F9 → F10 → F11 → F12 está **ejecutado**.

La auditoría **S-001** de IronLoot está completa. El sistema está en **Clase C** (cap por freshness), Health 86.1, con 7 hallazgos abiertos.

**Próxima acción recomendada**: Revisar RESUMEN.md y aprobar hallazgos → promover via `[START FPGE]` para priorización.

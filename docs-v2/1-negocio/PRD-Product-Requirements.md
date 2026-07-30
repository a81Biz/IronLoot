# PRD — Product Requirements Document — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia (reconcilia `02-PRD` con el código) |
| **Fuente** | `audit/raw/B/D`, `02-PRD`, código de módulos y controllers |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 02-PRD, 04-App-Flow, 08-API-Catalog |
| **Código usado** | `src/api/src/modules/*`, `src/apps/base`, `src/apps/client`, `src/admin` |
| **Nivel de confianza** | Alto (cada requisito respaldado por endpoint/servicio) |

> Requisitos de producto con criterios de aceptación **verificados contra el código**. Cada uno indica su estado real. Las reglas se referencian por `RN-*` ([Catálogo de Reglas](../transversal/Catalogo-Maestro-de-Reglas.md)); los casos por `UC-*` ([Casos de Uso](../transversal/Catalogo-Maestro-de-Casos-de-Uso.md)).

## 1. Épicas de producto

| Épica | Descripción | Estado real |
|---|---|---|
| E1 Cuentas | Registro, verificación, login, 2FA, perfil, onboarding vendedor | ✅ Operable |
| E2 Catálogo | Publicación y navegación de subastas | ✅ Operable |
| E3 Puja | Puja competitiva con bloqueo de fondos y soft-close | ✅ UI y Socket.io en `pages-auction-detail.js` (AUD-002 corregido) |
| E4 Monedero | Depósito, retiro, historial, bloqueo/liberación | ✅ Backend y UI; el CLIENT proxya por BFF (`AUD-003` corregido) |
| E5 Cierre y Orden | Adjudicación automática, captura, orden | ⚠️ Backend sí (AUD-012) |
| E6 Cumplimiento | Envío, entrega, calificación | ✅ Operable |
| E7 Conflictos | Disputa y reembolso | ⚠️ Resolución no mueve dinero (AUD-010) |
| E8 Monetización | Comisiones | ✅ Fuente única `commissionsService.resolveRatePercent` (AUD-005 corregido) |
| E9 Backoffice | Moderación, finanzas, KYC, CFDI, campañas, reportes | ⚠️ CFDI stub (AUD-016) |
| E10 Fiscal | Facturación CFDI | ✗ **No funcional** (AUD-016) |

## 2. Requisitos funcionales con criterios de aceptación

### E1 — Cuentas
- **RF-01** Registro con verificación de email. *AC:* usuario creado en `PENDING_VERIFICATION`; no puede loguear hasta verificar (`RN-03`). **[✅ `auth.controller.ts:49`]**
- **RF-02** Login con JWT (15m) + refresh (7d) + 2FA opcional. *AC:* `RN-02`, `RN-07`; SUSPENDED/BANNED bloqueados (`RN-04`). **[✅]**
- **RF-03** Onboarding de vendedor. *AC:* términos + ACTIVE + email verificado + displayName + dirección (`RN-56`). **[✅ `users.controller.ts:234`]**

### E2 — Catálogo
- **RF-10** Listar subastas activas (público, paginado, búsqueda). **[✅ BASE `app.controller.ts:48`]**
- **RF-11** Ver detalle de subasta. **[✅ BASE]** — el CTA "Pujar ahora" enlaza a una ruta inexistente (`AUD-002`).

### E3 — Puja
- **RF-20** Colocar puja `> currentPrice` sobre subasta activa. *AC:* `RN-13`,`RN-15`,`RN-16`. **[✅ API y UI; `AUD-002` corregido]**
- **RF-21** Incremento mínimo configurable. *AC:* `RN-14`. **[✅ aplicada en `bids.service.ts:92-98`; `AUD-009` corregido]**
- **RF-22** Bloqueo de fondos al pujar; liberación al ser superado. *AC:* `RN-22`,`RN-23`. **[✅ backend]**
- **RF-23** Soft-close extiende la subasta. *AC:* `RN-17`. **[✅ backend; sin feedback WS en UI]**

### E4 — Monedero
- **RF-30** Depositar (monto verificado del proveedor). *AC:* `RN-24`. **[✅ `wallet.controller.ts`; `AUD-003` corregido — el CLIENT proxya por BFF]**
- **RF-31** Retirar (límite 5.000 MXN/día + método registrado). *AC:* `RN-25`. **[✅ `AUD-003` corregido]**
- **RF-32** Ver balance e historial de ledger. **[✅]**

### E5 — Cierre y Orden
- **RF-40** Cerrar subastas expiradas por cron con lock. *AC:* `RN-30`. **[✅ `auction-scheduler.service.ts`]**
- **RF-41** Crear orden PAID del ganador y capturar fondos; liberar perdedores. **[✅ backend]**

### E6 — Cumplimiento
- **RF-50** Declarar el envío (orden `PAID`, **sólo el vendedor**); la transición pasa por `OrderStateMachine`. *AC:* `RN-34`. **[✅]**
- **RF-52** **Confirmar la recepción — sólo el comprador** (orden `SHIPPED`). El vendedor recibe **403**. *AC:* `RN-64b`. **[✅ PT-174]**
- **RF-53** **El neto del vendedor espera desde la confirmación**, no desde el estado: `shipment.deliveredAt` + `SETTLEMENT_HOLDBACK_HOURS` (72). Se libera igual al vencer `DISPUTE_WINDOW_DAYS` (14), para que un comprador que calle no retenga el dinero. *AC:* `RN-64`. **[✅ PT-174]**
- **RF-51** Calificar contraparte (envío DELIVERED). *AC:* `RN-43`. **[✅]**

### E7 — Conflictos
- **RF-60** Abrir disputa (14 días, participante). *AC:* `RN-40`. **[✅ `AUD-003` corregido]**
- **RF-61** Resolver disputa (admin) + reembolso. *AC:* `RN-41`,`RN-42`. **[✗ **resolución no mueve dinero** (`AUD-010`, **abierto**); reembolso **con 16 pruebas en 3 suites** — `AUD-013` corregido]**

### E8 — Monetización
- **RF-70** Comisión configurable por vendedor/global aplicada a la venta. *AC:* `RN-31`. **[✅ fuente única `resolveRatePercent`; `AUD-005` corregido]**

### E9/E10 — Backoffice y Fiscal
- **RF-80** Moderar subastas/usuarios/KYC; reportes; campañas. **[⚠️ admin salta FSM `AUD-011`]**
- **RF-81** Emitir CFDI por orden. *AC:* factura timbrada. **[✗ stub `AUD-016`]**

## 3. Requisitos no funcionales (resumen)

| NFR | Requisito | Estado real |
|---|---|---|
| Seguridad | JWT+2FA, rate limiting, validación de firma de webhooks (HMAC en MP/HeyBanco, verify-webhook-signature en PayPal), secretos gated en prod | ⚠️ **WS sin auth (AUD-006, abierto)** — sólo emite datos de subasta, ya públicos. ADMIN **con Helmet+CSP** (AUD-007 corregido) y credenciales por defecto **rechazadas al arrancar en producción** (AUD-004 corregido). Texto original: creds admin default (AUD-004) |
| Integridad financiera | Ledger inmutable; `Decimal`; MXN | ⚠️ **`Money` VO sigue sin usarse (AUD-012, abierto)**. `payments` en `MXN`: **AUD-008 corregido** (medido en la base el 2026-07-29) |
| Disponibilidad | Healthchecks Docker; scheduler con lock Redis | ✅ |
| Observabilidad | AuditEvent/ErrorEvent/RequestLog con traceId | ✅ retención **única y configurable** — `LOG_RETENTION_DAYS` (90 por defecto), PT-043 (AUD-018 corregido) |
| Rendimiento | Índices en tablas de puja/wallet/orden | ✅ |

## 4. Fuera de alcance (explícito)

- Multi-moneda (el modelo asume MXN; expandir requeriría cambios de esquema — `Modelo-Maestro-de-Dominio §5`).
- Integración de tracking de transportista en vivo (hoy es captura manual, `AUD-024`).
- SPA/framework frontend (decisión ADR-002: SSR Nunjucks).
- Roles admin granulares (hoy un único flag `isAdmin`, `D §5`).

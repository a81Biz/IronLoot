# Modelo Funcional y Reglas Funcionales — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia |
| **Fuente** | `audit/raw/B/D`, `transversal/*` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 04-App-Flow, 02-PRD, 05-UIUX |
| **Código usado** | módulos de `src/api`, controllers de frontends |
| **Nivel de confianza** | Alto |

## 1. Matriz Actor × Caso de uso (referencia)

La matriz completa está en el [Catálogo Maestro de Casos de Uso §Matriz](../transversal/Catalogo-Maestro-de-Casos-de-Uso.md). Resumen de participación:

| Actor | Casos donde participa |
|---|---|
| Visitante | UC-01..04 |
| Comprador | UC-02, 04, 05, 07–10, 13, 15, 16 |
| Vendedor | UC-06, 11–15, 16 |
| Administrador | UC-18–26 |
| Sistema | UC-01/03 (email), UC-06/27 (cron), UC-17 (webhook) |

## 2. Modelo funcional (áreas funcionales → capacidades)

| Área funcional | Capacidades | Módulos |
|---|---|---|
| **Cuentas** | registro, verificación, login, 2FA, perfil, settings, onboarding vendedor | auth, users |
| **Catálogo** | crear/editar/publicar subasta, listar, detalle, watchlist | auctions, watchlist |
| **Puja** | colocar puja, ver mis pujas/historial, soft-close | bids |
| **Monedero** | balance, depósito, retiro, historial, bloqueo/liberación | wallet, payments |
| **Órdenes** | crear (auto), listar, detalle, transición de estado | orders |
| **Cumplimiento** | envío, actualización de estado, calificación | shipments, ratings |
| **Conflictos** | disputa, reembolso | disputes, refunds |
| **Notificaciones** | in-app, email, campañas | notifications |
| **Backoffice** | moderación, usuarios, KYC, comisiones, CFDI, reportes, reconciliación, SEO/CMS, config | admin, kyc, cfdi, commissions, cms, seo, system-config |
| **Observabilidad** | audit log, errores, request logs, diagnostics, health | audit, diagnostics, health |

## 3. Reglas funcionales (comportamiento observable)

Las reglas de negocio canónicas viven en el [Catálogo Maestro de Reglas](../transversal/Catalogo-Maestro-de-Reglas.md) (`RN-*`). Aquí se listan reglas **funcionales de UI/flujo**:

| ID | Regla funcional | Evidencia | Estado |
|---|---|---|---|
| RF-UI-01 | BASE es 100% público (guest); ninguna ruta requiere auth. | `base app.controller.ts` | ✅ |
| RF-UI-02 | CLIENT exige JWT válido en cookie para toda ruta. | `client-auth.guard.ts` | ✅ |
| RF-UI-03 | SSO cross-subdominio: BASE fija cookie; CLIENT la lee vía `COOKIE_DOMAIN`. | `base/src/main.ts`, `client-auth.guard.ts` | ✅ |
| RF-UI-04 | Las páginas de vendedor son accesibles a cualquier autenticado (el gate seller es API-side). | `D §5` | ⚠️ gap UI |
| RF-UI-05 | ADMIN exige sesión `isAdmin`; un único rol plano. | `admin auth.guard.ts` | ⚠️ sin roles |
| RF-UI-06 | Las escrituras de CLIENT deberían pasar por BFF; hoy llaman al API directo. | `D §3` | ✗ AUD-003 |
| RF-UI-07 | El detalle de subasta ofrece "Pujar ahora" que enruta a CLIENT. | `detail.html:69` | ✗ AUD-002 (destino inexistente) |
| RF-UI-08 | Notificaciones in-app: listar, contador no leídas, marcar leídas. | `notifications.controller.ts` | ✅ |

## 4. Reglas de validación de entrada (DTOs)

- Montos monetarios como `Decimal` positivos; validación `class-validator` en DTOs (`CreateAuctionDto`, `DepositDto`, `WithdrawDto`). `[E comunidad 7]`
- Duración de subasta acotada por `AUCTION_MIN/MAX_DURATION_HOURS`.
- Score de rating 1–5 (no forzado en BD; validado en servicio). `[C Rating]`

> Trazabilidad regla→prueba y eslabones rotos: [Matriz Global de Trazabilidad](../transversal/Matriz-Global-de-Trazabilidad.md).

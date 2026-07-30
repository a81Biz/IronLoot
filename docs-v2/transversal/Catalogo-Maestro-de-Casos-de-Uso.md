# Catálogo Maestro de Casos de Uso — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción documental (fuente única de casos de uso) |
| **Fuente** | `audit/raw/B/D-*.md`, `04-App-Flow`, `02-PRD` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 04-App-Flow, 02-PRD, 05-UIUX |
| **Código usado** | controllers de `src/api`, `src/apps/base`, `src/apps/client`, `src/admin` |
| **Nivel de confianza** | Alto (respaldado por endpoint/pantalla) |

> **Fuente única.** Cada caso cita su respaldo en código; los no operables end-to-end se marcan y enlazan a un hallazgo. Detalle de escenarios (happy/alternate/exception) en [`2-producto/`](../2-producto/).

## Actores

| Actor | Descripción |
|---|---|
| **Visitante** | Usuario no autenticado (BASE). |
| **Comprador** | Usuario autenticado que puja/gana/paga. |
| **Vendedor** | Comprador con `isSeller=true` que publica subastas. |
| **Administrador** | Operador del backoffice (sesión ADMIN). |
| **Sistema** | Scheduler/cron, webhooks de proveedores. |

## Matriz Actor × Caso de uso

| Caso de uso | Vis | Comp | Vend | Admin | Sist | Respaldo | Estado |
|---|:--:|:--:|:--:|:--:|:--:|---|---|
| UC-01 Registrarse + verificar email | ✔ | | | | ✔ | `auth.controller.ts:49` / BASE auth | ✅ |
| UC-02 Iniciar sesión (+2FA) | ✔ | ✔ | ✔ | | | `auth.controller.ts:75` | ✅ |
| UC-03 Recuperar/restablecer contraseña | ✔ | | | | ✔ | `auth.controller.ts:183` | ✅ |
| UC-04 Explorar catálogo y ver detalle | ✔ | ✔ | | | | BASE `app.controller.ts:48` | ✅ |
| UC-05 **Pujar en subasta** | | ✔ | | | | `bids.controller.ts:18` (API) | ✅ (AUD-002 corregido: UI + Socket.io) |
| UC-06 Ganar subasta / cierre automático | | ✔ | ✔ | | ✔ | `auction-scheduler.service.ts:127` | ⚠️ (AUD-012) |
| UC-07 Añadir/quitar de watchlist | | ✔ | | | | `watchlist.controller.ts:38` | ✅ (AUD-003 corregido: el CLIENT proxya por BFF) |
| UC-08 Depositar en wallet | | ✔ | ✔ | | ✔ | `wallet.controller.ts:83` | ✅ (AUD-003 corregido) |
| UC-09 Retirar de wallet | | ✔ | ✔ | | | `wallet.controller.ts:113` | ✅ (AUD-003 corregido) |
| UC-10 Ver historial/ledger | | ✔ | ✔ | | | `wallet.controller.ts:60` | ✅ |
| UC-11 Habilitarse como vendedor | | ✔ | | | | `users.controller.ts:234` | ✅ (AUD-003 corregido) |
| UC-12 Publicar/editar subasta | | | ✔ | | | `auctions.controller.ts:39,172` | ✅ (AUD-003 corregido) |
| UC-13 Gestionar orden (comprador/vendedor) | | ✔ | ✔ | | | `orders.controller.ts:28` | ✅ |
| UC-14 Registrar envío / actualizar estado | | | ✔ | | | `shipments.controller.ts:27` | ✅ |
| UC-15 Calificar contraparte | | ✔ | ✔ | | | `ratings.controller.ts:16` | ✅ |
| UC-17 **Declarar envío** (vendedor) | | | ✔ | | | `shipments.controller.ts` | ✅ sólo el vendedor; el comprador recibe 403 |
| UC-18 **Confirmar recepción** (comprador) | | ✔ | | | | `shipments.controller.ts` | ✅ **sólo el comprador**; arranca el reloj del holdback (PT-174) |
| UC-16 Abrir/gestionar disputa | | ✔ | ✔ | | | `disputes.controller.ts:16` | ✅ (AUD-003 corregido) |
| UC-17 Confirmar pago vía webhook | | | | | ✔ | `payments.controller.ts:45` | ✅ |
| UC-18 Moderar subastas/lotes/usuarios | | | | ✔ | | `admin.controller.ts:97` | ⚠️ salta FSM (AUD-011) |
| UC-19 Resolver disputa | | | | ✔ | | `admin.service.ts:868` | ✗ no mueve dinero (AUD-010) |
| UC-20 Procesar reembolso | | | | ✔ | | `refunds.service.ts` | ✅ con pruebas (AUD-013 corregido) |
| UC-21 Configurar comisiones | | | | ✔ | | `commissions.controller.ts` | ✅ cableado al cierre (AUD-005 corregido) |
| UC-22 Revisar KYC | | | | ✔ | | `kyc.service.ts` | ⚠️ manual |
| UC-23 Generar CFDI | | | | ✔ | | `cfdi.service.ts:33` | ✗ stub (AUD-016) |
| UC-24 Enviar campaña de notificaciones | | | | ✔ | | `admin.controller.ts:545` | ⚠️ |
| UC-25 Reconciliar pagos | | | | ✔ | | `admin.service.ts:904` | ✗ stub (AUD-016 rel.) |
| UC-26 Ver reportes financieros/operativos/fiscales | | | | ✔ | | `admin.controller.ts:267` | ✅ |
| UC-27 Cerrar subastas expiradas (cron) | | | | | ✔ | `auction-scheduler.service.ts:36` | ✅ |

## Flujos principales (referencia)

1. **Onboarding:** UC-01 → UC-02 → (UC-11 para vender).
2. **Compra:** UC-04 → UC-08 → UC-05 → UC-06 → UC-13 → UC-15. *(Roto en UC-05 por AUD-002.)*
3. **Venta:** UC-11 → UC-12 → UC-06 → UC-14 → UC-15.
4. **Conflicto:** UC-16 → UC-19 → UC-20. *(UC-19 no mueve dinero, AUD-010.)*
5. **Operación admin:** UC-18/UC-21/UC-22/UC-24/UC-26.

> **Cobertura de casos (revisada 2026-07-29).** El recuento original —10 operables, 12 parciales «mayormente por AUD-003», 5 con eslabón roto— **ya no describe el sistema**: `AUD-003` (auth UI) y `AUD-002` (UC-05, sin UI de puja) están corregidos y verificados. Siguen con eslabón roto **UC-19** (resolver disputa no mueve dinero, `AUD-010`) y **UC-23** (CFDI, `AUD-016`). El recuento exacto no se rehace aquí: hacerlo a ojo sería sustituir una cifra obsoleta por otra sin medir. Todos con respaldo en código o marcados como pendientes explícitos.

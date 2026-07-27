# ENRICHMENT.md — PT-076 Activación real de PayPal como pasarela de depósito

**PT-076** | **Fecha**: 2026-07-25 | **Origen**: Solicitud directa del desarrollador | **Complejidad**: **MAJOR** | **Tipo**: FEATURE

> **Decisión tomada (2026-07-25)**: el desarrollador elige la **Ruta B — Orders v2 API + Webhooks**. Complejidad fijada en MAJOR. La elección disparó el Investigation Gate (55% < 70%); la investigación está en `DISCOVERY.md` § PT-076-INV y elevó la confianza a 80%.

> El ENRICHMENT anterior (PT-035) se archivó en `docs/implementation/archive/ENRICHMENT-PT-035.md`.

---

## Solicitud original

> "comienza el protocolo FDGE para poder usar paypal y dime qué claves necesitas para ir a paypal por ellas"

Contexto previo de la conversación: se descartó el MCP de PayPal por no aportar valor al flujo de pago (opera la cuenta PayPal vía REST; el checkout de IronLoot va por WPS+IPN). El objetivo es **activar PayPal de verdad** como método de depósito de wallet.

---

## 1. Descripción enriquecida

El proveedor PayPal está **implementado en código pero nunca configurado ni probado**. La UI ya lo ofrece al usuario y la API lo declara siempre disponible, pero cualquier intento de depósito falla en tiempo de ejecución. PT-076 cierra esa brecha: dejar PayPal operativo end-to-end en sandbox, con evidencia de acreditación real en wallet.

### Estado actual verificado (gap)

| Elemento | Estado actual | Evidencia | Estado objetivo |
|---|---|---|---|
| `PAYPAL_BUSINESS_EMAIL` | `merchant@example.com` (placeholder) | `src/api/.env:113` | Email de cuenta business sandbox real |
| `PAYPAL_CLIENT_ID` | Vacío | `src/api/.env:111` | Definido (hoy solo actúa de interruptor) |
| `PAYPAL_CLIENT_SECRET` | Vacío y **no se lee en ningún punto del código** | grep en `src/api/src` | Eliminar o justificar (ruta B) |
| Disponibilidad del proveedor | **Hardcodeada como disponible** sin comprobar config | `payments.service.ts:250` | Derivada de `checkStatus()` |
| Gate de configuración | `checkStatus()` valida `PAYPAL_CLIENT_ID`; `createPayment()` revienta por `PAYPAL_BUSINESS_EMAIL` | `paypal.provider.ts:17` vs `:35-37` | Gate coherente sobre la misma variable |
| UI de depósito | Ofrece la opción PayPal al usuario | `views/pages/wallet/deposit.html:15` | Solo visible si el proveedor está configurado |
| Acreditación en wallet | **Ya soporta `mc_gross`** (campo IPN de PayPal) | `payments.service.ts:223-226` | Sin cambios — verificar con pago real |
| Webhook IPN | Ruta `@Public` operativa, verificación IPN implementada | `payments.controller.ts:45-46`, `paypal.provider.ts:82-92` | Verificada contra PayPal real |
| URL de retorno | Fallback obsoleto a `localhost:5173` (el `web/` eliminado) | `paypal.provider.ts:40` | Fallback a CLIENT (5175) |
| Tests | **Cero tests del proveedor PayPal** | `find src -iname "*paypal*spec*"` sin resultados | Suite unitaria + evidencia E2E |
| Documentación | `10-Technical-Debt.md:17` afirma que PayPal es operativo — **falso** | `10-Technical-Debt.md:17` | Corregida |

### Síntoma para el usuario final

El desplegable de depósito muestra "PayPal"; al seleccionarlo, `createPayment()` lanza `PAYPAL_BUSINESS_EMAIL not configured` (`paypal.provider.ts:36`). Fallo 100% reproducible, no intermitente.

---

## 2. Decisión arquitectónica pendiente (requiere ACK humano)

La integración actual usa **WPS (Website Payments Standard) + IPN**, un flujo legacy. Existe una alternativa moderna. Esta decisión determina **qué credenciales hay que obtener**, por lo que debe resolverse antes de STATE 2.

### Ruta A — Activar WPS+IPN existente (recomendada como MVP)

- **Complejidad**: STANDARD
- **Qué implica**: rellenar config, corregir el gate incoherente, añadir tests, probar con cuentas sandbox.
- **Código nuevo**: mínimo. El provider y la acreditación ya existen y ya contemplan `mc_gross`.
- **Credenciales**: solo email de cuenta business sandbox (ver §9).
- **Riesgo**: WPS e IPN son tecnologías legacy que PayPal desaconseja para integraciones nuevas; IPN está marcado como deprecado en favor de Webhooks. Funcionan, pero son deuda técnica desde el día uno.

### Ruta B — Migrar a Orders v2 API + Webhooks

- **Complejidad**: MAJOR
- **Qué implica**: reescribir el provider completo (OAuth2 client_credentials, creación de orden, captura, verificación de firma de webhook vía `webhook_id`).
- **Credenciales**: Client ID + Secret + Webhook ID.
- **Ventaja**: alineado con la dirección de PayPal y con el patrón ya usado en MercadoPago (API REST + firma), en lugar de mantener dos patrones divergentes.
- **Riesgo**: superficie de cambio mucho mayor, sin ninguna cobertura de tests previa de la que partir.

**Recomendación emitida**: Ruta A como MVP, Ruta B posterior.

**Decisión del humano: RUTA B.** La recomendación queda descartada por decisión explícita del desarrollador. Consecuencias asumidas conscientemente:
- Complejidad MAJOR, con análisis de riesgo y regresión obligatorios (FDGE).
- Reescritura completa del proveedor partiendo de cero cobertura de tests.
- Se evita la deuda técnica de nacer sobre WPS/IPN legacy, y PayPal queda alineado con el patrón REST+firma que ya usa MercadoPago.

El resto de este documento (§3 en adelante) está reformulado sobre la Ruta B.

---

## 3. Criterios de aceptación

Reformulados sobre la **Ruta B** (Orders v2 + Webhooks).

| ID | Criterio | Verificable por |
|---|---|---|
| CA-01 | `GET /payments/providers` incluye `PAYPAL` **solo si** el proveedor está realmente configurado | Test unitario + respuesta HTTP |
| CA-02 | Con PayPal sin configurar, la opción no se ofrece en la UI de depósito | Inspección de `deposit.html` renderizado |
| CA-03 | `checkStatus()` valida las credenciales que el proveedor **realmente usa** (Client ID + Secret); no existe estado "OK pero revienta" | Test unitario |
| CA-04 | El proveedor obtiene y **cachea** un access token OAuth2, y lo renueva de forma transparente al expirar | Test unitario con reloj simulado |
| CA-05 | Un depósito crea una orden vía `POST /v2/checkout/orders` (`intent=CAPTURE`, MXN) y redirige al comprador a la URL de aprobación devuelta en los enlaces HATEOAS | Evidencia: request/response + captura |
| CA-06 | La resolución del enlace de aprobación tolera **tanto `payer-action` como `approve`** como `rel` | Test unitario con ambos payloads |
| CA-07 | Tras la aprobación del comprador, el pago se **captura** y la orden alcanza estado `COMPLETED` | Log de API + evidencia |
| CA-08 | El webhook `PAYMENT.CAPTURE.COMPLETED` se verifica vía `POST /v1/notifications/verify-webhook-signature` y devuelve `verification_status: SUCCESS` | Log de API + evidencia |
| CA-09 | El importe se extrae de `resource.amount.value` (Orders v2), **sin romper** las rutas existentes de MP (`transaction_amount`) ni Stripe (`amountTotal`) | Test unitario por proveedor |
| CA-10 | El saldo del wallet se incrementa exactamente en el importe pagado, con asiento en el ledger | Consulta directa a BD (evidencia) |
| CA-11 | Un webhook con firma inválida es **rechazado** y no acredita saldo | Test + log |
| CA-12 | Un webhook reentregado (mismo `id` de evento `WH-...`) no acredita dos veces, incluso tras 25 reintentos | Test + consulta BD |
| CA-13 | La referencia `DEP-<userId>-<timestamp>` viaja en `custom_id` y se recupera del webhook para identificar al usuario | Test + evidencia E2E |
| CA-14 | Las URLs de retorno apuntan a CLIENT (5175), no al `web/` eliminado (5173) | Revisión de código + test |
| CA-15 | **Sin regresión en MercadoPago**: el depósito por MP sigue acreditando correctamente | Suite QA existente en verde |
| CA-16 | `10-Technical-Debt.md` refleja el estado real de PayPal | Revisión documental |

---

## 4. Escenarios de prueba

### Happy path
1. **E-01** — Usuario con sesión inicia depósito de 500 MXN vía PayPal → redirige a sandbox → paga con cuenta personal sandbox → IPN `payment_status=Completed` → wallet +500 MXN, ledger con asiento `DEPOSIT`.

### Casos borde
2. **E-02** — Usuario cancela en PayPal → vuelve a `/wallet/deposit-cancel` → **sin** cambio de saldo.
3. **E-03** — IPN llega con `payment_status=Pending` → no acredita; al llegar el `Completed` posterior, acredita una sola vez.
4. **E-04** — IPN duplicado con el mismo `txn_id` → segunda acreditación ignorada (idempotencia).
5. **E-05** — Importe con decimales (99.99 MXN) → acredita exactamente 99.99, sin error de redondeo.

### Casos de fallo
6. **E-06** — IPN manipulado (importe alterado) → verificación PayPal devuelve `INVALID` → rechazo, sin acreditación, log de error.
7. **E-07** — PayPal inalcanzable durante la verificación IPN (timeout 10s, `paypal.provider.ts:133`) → no acredita, entra en la cola de reintento (`webhook-retry.worker`).
8. **E-08** — `PAYPAL_BUSINESS_EMAIL` ausente → el proveedor no se ofrece; si se fuerza por API, error controlado, no 500 crudo.
9. **E-09** — `invoice` con referencia que no casa `DEP-<userId>-<timestamp>` → no acredita, log de error (`payments.service.ts:218`).

---

## 5. NFRs

- **Seguridad**: ningún IPN acredita saldo sin verificación previa contra PayPal. La ruta del webhook es `@Public` por diseño (las pasarelas no envían JWT); la firma es el único control de acceso — no debilitarlo.
- **Idempotencia**: la acreditación debe ser idempotente por `txn_id`. Es el requisito más crítico: PayPal reenvía IPNs durante días si no recibe HTTP 200.
- **Trazabilidad**: todo IPN (aceptado o rechazado) queda en el log de auditoría con su `txn_id` e `invoice`.
- **Moneda**: MXN, coherente con el estándar global del proyecto.
- **Secretos**: ninguna credencial en el repo ni en el chat. Solo en `src/api/.env` (gitignored, verificado en `.gitignore:12`).
- **Sin regresión en MercadoPago**: el flujo MP, ya validado con pago real (PT-063/064/065), no debe verse afectado.

---

## 6. Fuera de alcance (explícito)

- Migración a Orders v2 API (Ruta B) — PT independiente si se aprueba.
- PayPal en **producción** con dinero real. PT-076 es exclusivamente sandbox.
- Pagos con PayPal fuera del depósito de wallet (p. ej. pago directo de una orden de subasta).
- Reembolsos vía PayPal — el módulo `refunds` queda intacto.
- Retirada de fondos hacia PayPal (payout). El retiro sigue siendo manual/SPEI (PT-069..072).
- Stripe y Hey Banco, que siguen sin configurar.
- MCP de PayPal — descartado explícitamente por el desarrollador.

---

## 7. Componentes afectados

| Componente | Cambio previsto |
|---|---|
| `providers/paypal.provider.ts` | **Reescritura completa**: OAuth2 con cacheo de token, `POST /v2/checkout/orders`, captura, verificación de firma de webhook |
| `payments.service.ts` | `getAvailableProviders()` derivado de `checkStatus()`; extracción de importe desde `resource.amount.value`; idempotencia por `id` de evento |
| `interfaces/payment-provider.interface.ts` | **Posible** ampliación con un método de captura — decisión de STATE 2 (ver `DISCOVERY.md` I-08). Si se amplía, afecta a los 4 proveedores |
| `apps/client/views/pages/wallet/deposit.html` | Render condicionado a proveedores realmente disponibles |
| `src/api/.env` / `.env.example` | `PAYPAL_WEBHOOK_ID` nueva; `PAYPAL_CLIENT_SECRET` pasa a tener uso real; `PAYPAL_BUSINESS_EMAIL` y `PAYPAL_MODE` a revisar |
| `src/api/test/` (nuevo) | Suite unitaria del proveedor PayPal — hoy inexistente |
| `docs/enterprise-documentation/10-Technical-Debt.md` + Registro de ADR | Corregir afirmación falsa; registrar ADR de la migración WPS → Orders v2 |

**Impacto en modelo de datos**: `Payment` ya contempla `PAYPAL` en el enum y `externalId` + `metadata` cubren Orders v2. La idempotencia por `id` de evento **podría** requerir un índice o tabla de eventos procesados — a determinar en STATE 2.

---

## 8. Riesgos identificados

| ID | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R-01 | **IPN no alcanzable en local**: `notify_url` se construye desde `API_BASE_URL` (`paypal.provider.ts:55`), que en local es `localhost` — PayPal no puede llegar | Bloqueante para E-01..E-07 | Túnel público, igual que se resolvió en MP con `MERCADO_PAGO_NOTIFICATION_URL` |
| R-02 | Doble acreditación por reentrega de webhook. **Agravado en Ruta B**: PayPal reintenta hasta 25 veces en 3 días | Alto (dinero) | Idempotencia por `id` de evento — CA-12 |
| R-03 | Tocar `payments.service.ts` puede romper la acreditación de MP ya validada. **Agravado**: la extracción de importe es código compartido y hay que modificarla (`DISCOVERY.md` I-09) | Alto | Tests de regresión MP antes y después — CA-15 |
| R-04 | ~~WPS/IPN legacy retirado por PayPal~~ — **eliminado**: la Ruta B lo evita | — | Resuelto por la decisión |
| R-05 | Ampliar la interfaz `PaymentProvider` impacta a los 4 proveedores | Alto | Decisión explícita en STATE 2; preferir encaje sin tocar la interfaz si es viable |
| R-06 | País/moneda de la cuenta sandbox incompatibles con MXN | Medio | Crear las cuentas sandbox en MX. MXN confirmado como soportado y con decimales |
| R-07 | Expiración del access token OAuth2 en mitad de una operación | Medio | Cacheo con renovación proactiva y reintento único ante 401 — CA-04 |
| R-08 | Ambigüedad `rel: payer-action` vs `approve` en el enlace de aprobación | Medio | Tolerar ambos — CA-06 |
| R-09 | PayPal declara deprecado "el método antiguo" de verificación de webhooks sin fecha de sunset (`DISCOVERY.md` I-12) | Bajo, no determinado | Verificar empíricamente en sandbox durante STATE 4 |

---

## 9. Credenciales y accesos requeridos del humano

Lo que hay que traer de PayPal **para la Ruta B** (decidida):

| # | Qué | Dónde obtenerlo | Destino |
|---|---|---|---|
| 1 | **Client ID** de la app sandbox | developer.paypal.com → Apps & Credentials → Sandbox → tu app | `PAYPAL_CLIENT_ID` |
| 2 | **Client Secret** de esa misma app | Mismo panel, botón *Show* junto al secret | `PAYPAL_CLIENT_SECRET` |
| 3 | **Webhook ID** | En la app sandbox → *Webhooks* → *Add Webhook*: URL del túnel + `/payments/webhook/PAYPAL`, suscrito a `PAYMENT.CAPTURE.COMPLETED`. PayPal devuelve el ID (formato `0NH55953DH663215D`) | `PAYPAL_WEBHOOK_ID` (**variable nueva**) |
| 4 | **URL pública de túnel** hacia la API local | La misma herramienta usada para MP. PayPal exige **HTTPS en el puerto 443** | `API_BASE_URL` durante las pruebas |
| 5 | **Cuenta personal sandbox** (comprador): email + password | developer.paypal.com → Testing Tools → Sandbox Accounts → tipo *Personal*, país MX | Solo para pruebas manuales; no va a `.env` |

Notas:
- El **orden importa**: el webhook (#3) no se puede registrar hasta tener la URL del túnel (#4). Levanta el túnel primero.
- Si el túnel cambia de URL, hay que volver a registrar el webhook y actualizar `PAYPAL_WEBHOOK_ID`.
- **`PAYPAL_BUSINESS_EMAIL` deja de ser necesario** en Ruta B: era un parámetro del formulario WPS. Se elimina o se marca como obsoleto.
- No hace falta habilitar IPN: se sustituye por Webhooks.
- La cuenta *Business* sandbox se crea automáticamente junto a la app; no hay que copiar su email a ninguna parte.

---

## 10. Confianza

| Métrica | Valor | Justificación |
|---|---|---|
| **Architecture Confidence** | **92%** | Provider, servicio, controlador, esquema y ruta de acreditación leídos y citados directamente. |
| **Implementation Confidence (Ruta B)** | **80%** (era 55%) | Elevada por la investigación PT-076-INV: endpoints, cuerpos de petición, cabeceras, evento y moneda confirmados contra documentación oficial. Lo pendiente (I-03, I-12) es verificable en sandbox; I-08 es decisión de diseño, no incógnita. |

**Investigation Gate superado** (80% > 70%). Habilitado el paso a STATE 2.

---

## 11. Estado

**STATE 1-E COMPLETO + INVESTIGACIÓN CERRADA — ESPERANDO ACK HUMANO**

Ruta decidida: **B (Orders v2 + Webhooks)**. Investigación en `DISCOVERY.md` § PT-076-INV.

Bloqueos para avanzar a STATE 2: ninguno técnico. Solo falta el ACK del enriquecimiento reformulado.

Las credenciales del §9 no bloquean STATE 2 (estrategia) ni STATE 3 (Proposal Package); sí bloquean STATE 4 (implementación y pruebas reales).

Prohibido hasta el ACK: diseño de propuesta, creación de rama, modificación de código fuente.

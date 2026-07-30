# Manual de Usuario — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia |
| **Fuente** | `audit/raw/D-frontend.md` (rutas/pantallas), `B` (comportamiento API) |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 05-UIUX-Brief, 04-App-Flow, README |
| **Código usado** | `apps/base`, `apps/client` controllers/templates |
| **Nivel de confianza** | Alto |

> Manual para **compradores y vendedores**. Las funciones marcadas ⚠️/✗ tienen limitaciones reales hoy (ver [Registro de Hallazgos](../transversal/Registro-de-Hallazgos.md)). Sitio público: `base.ironloot.local` · Portal privado: `client.ironloot.local`.

## 1. Crear cuenta e iniciar sesión (sitio público)

| Pantalla | Ruta | Qué hacer |
|---|---|---|
| Registro | `/auth/register` | Email, usuario, contraseña. Recibes un correo de verificación. |
| Verificación | (enlace del correo) | Confirma tu email; tu cuenta pasa a **Activa**. |
| Login | `/auth/login` | Email + contraseña (+ código 2FA si lo activaste). |
| Recuperar contraseña | `/auth/recovery` → `/auth/reset-password` | Solicita enlace y define nueva contraseña. |

> No podrás iniciar sesión hasta **verificar tu email**. Si tu cuenta está suspendida o baneada, el acceso queda bloqueado.

## 2. Explorar y ver subastas (público)

- **Catálogo** `/auctions` — lista paginada con búsqueda.
- **Detalle** `/auctions/:id` — información del lote y precio actual. El botón **"Pujar ahora"** te lleva al portal privado.
- ✅ **Corregido (`AUD-002`).** La puja se hace desde el detalle de la subasta, con actualización en vivo por Socket.io.

## 3. Panel del comprador (portal privado)

| Función | Ruta | Descripción |
|---|---|---|
| Dashboard | `/dashboard` | Resumen de perfil, wallet, últimas pujas, subastas activas |
| Mis ofertas | `/my-bids` | Historial de tus pujas |
| Ganadas | `/auctions/won-auctions` | Subastas que ganaste (órdenes) |
| Watchlist | `/auctions/watchlist` | Subastas seguidas |
| Wallet | `/wallet` | Saldo disponible y retenido |
| Depositar | `/wallet/deposit` | Añadir fondos |
| Retirar | `/wallet/withdrawals` | Solicitar retiro (requiere KYC aprobado + CLABE registrada; máx. diario configurable) — pasa por aprobación del admin |
| Historial | `/wallet/history` | Movimientos del ledger |
| Órdenes | `/orders`, `/orders/:id` | Tus compras/ventas |
| Notificaciones | `/notifications` | Alertas (superado, ganada, etc.) |
| Disputas | `/disputes`, `/disputes/create` | Abrir/seguir disputas |
| Reputación | `/reputation` | Tus calificaciones |

### Cómo funciona tu dinero
1. **Depositas** en tu wallet (vía Mercado Pago / PayPal).
2. Al **pujar**, se **retienen** fondos por el importe de tu puja.
3. Si te **superan**, esos fondos se **liberan** automáticamente.
4. Si **ganas**, al cierre se cobra tu depósito y se genera la **orden**.

## 4. Panel del vendedor

| Función | Ruta | Requisito |
|---|---|---|
| Habilitarse como vendedor | `/seller/onboarding` | Términos + email verificado + perfil (dirección). Puede requerir **KYC**. |
| Crear subasta | `/auctions/create` | Ser vendedor |
| Editar subasta | `/auctions/:id/edit` | Sólo en borrador (DRAFT) |
| Mis subastas | `/seller/auctions` | — |
| Pedidos | `/seller/orders` | Gestionar ventas |

### Vender paso a paso
1. Habilítate como vendedor: onboarding + **KYC obligatorio** (envía tus documentos; el admin aprueba).
2. Crea la subasta (borrador) y **publícala**.
3. Al cerrar con ganador, se crea la orden pagada.
4. **Registra el envío** y actualiza a entregado.

### Cobrar tus ventas (retiro)
1. El **neto** de cada venta (importe − comisión) entra a tu wallet como **saldo retenido** (`pending`), no retirable de inmediato.
2. Se libera a **saldo disponible** cuando el pedido queda **entregado** o vence la ventana de disputa (14 días), lo que ocurra.
3. Registra tu **cuenta bancaria (CLABE)** en métodos de pago.
4. Solicita el retiro desde `/wallet/withdrawals`. Al solicitar, el importe se **reserva** de tu disponible.
5. El **admin aprueba** y realiza la transferencia **SPEI**; verás el retiro como **PAID**. Si lo rechaza, el importe se te **reintegra**.
5. Cobras el importe **menos la comisión** de la plataforma.
6. Puedes **calificar** al comprador tras la entrega.

## 5. Disputas

Si hay un problema tras la entrega, abre una **disputa dentro de 14 días**. El equipo de soporte la mediará y resolverá. ⚠️ El reembolso, cuando procede, lo ejecuta el administrador (`AUD-010`).

## 6. Notas y limitaciones actuales (transparencia)

- La **puja en la interfaz** y varias **acciones de escritura** (depósito, crear subasta, disputa) tienen limitaciones técnicas hoy (`AUD-002`, `AUD-003`).
- La **facturación fiscal (CFDI)** aún no está disponible (`AUD-016`).

Ver [FAQ y Mensajes](FAQ-y-Mensajes.md).

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

**Cuánto dura tu sesión.** Hasta **siete días** sin volver a escribir la contraseña, y se renueva sola
mientras uses el portal. *(Antes de julio de 2026 duraba quince minutos: el mecanismo de renovación
estaba escrito y no se llamaba.)*

**Si te devuelve al login de golpe**, normalmente es una de tres: pasaron los siete días, cerraste
sesión en otro sitio, o el sistema detectó que **tu sesión se estaba usando desde dos lugares a la
vez**. En ese último caso se cierra por seguridad — también para ti, porque no hay forma de saber cuál
de los dos accesos es el tuyo. Vuelve a entrar y, si no fuiste tú, **cambia la contraseña**.

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

Si hay un problema tras la entrega, abre una **disputa dentro de 14 días**. El equipo de soporte la mediará y resolverá. Si se resuelve a tu favor, **el reembolso entra en tu monedero en ese mismo momento** (`AUD-010` corregido, PT-191).

## 6. Notas y limitaciones actuales (transparencia)

- La **facturación fiscal (CFDI)** aún no está disponible (`AUD-016`).
- Las **categorías de subasta** no existen todavía: el catálogo se explora por búsqueda, precio y orden.
  Se retiró el filtro de categorías en `PT-209` porque **el modelo de datos no tiene ese campo** y
  ofrecer un filtro que no filtra es peor que no ofrecerlo.
- El **histórico de subastas cerradas no es público**. Es una decisión pendiente, no un olvido.

> **Corregido en PT-232.** Esta sección declaraba limitaciones en la puja y en «varias acciones de
> escritura» citando `AUD-002` y `AUD-003`, **que estaban cerrados desde julio**. Lo que sí estaba roto
> era otra cosa y más grave —el catálogo no podía mostrar subastas, el retiro no podía completarse, no se
> podía publicar una subasta ni calificar—, y **este documento no lo decía**. Un manual que enumera
> limitaciones que ya no existen y calla las que sí, entrena a no creerle.

## 7. Qué cambió el 2026-07-31

Una auditoría de interfaz midió el producto **desde la pantalla** y no desde el API. Lo que ahora
funciona y antes no:

| Antes | Ahora |
|---|---|
| El catálogo y la portada no podían mostrar ninguna subasta | Muestran el catálogo real, con imagen, cierre y número de pujas |
| Los filtros del catálogo no filtraban nada | Búsqueda, rango de precio y orden funcionan |
| No se podía publicar una subasta desde el portal | «Publicar» y «Cancelar» en *Mis subastas* |
| El retiro fallaba siempre, con el mensaje «Error al procesar» | Cadena completa: KYC → cuenta CLABE → verificación → solicitud, con el motivo exacto de cada rechazo |
| El neto de tus ventas no aparecía en ninguna pantalla | «Pendiente de liquidar» en el monedero, con su fecha de liberación |
| No se podía calificar a la contraparte | Formulario de calificación tras la entrega |
| La watchlist no se podía alimentar ni vaciar | «Seguir esta subasta» y «Dejar de seguir» |
| Notificaciones y disputas salían siempre vacías | Se ven, se marcan como leídas y llevan a su origen |
| No había forma de activar 2FA ni de cambiar la contraseña | Pantalla de **Seguridad** |
| Si el correo de verificación no llegaba, la cuenta quedaba inutilizable | «Reenviar enlace» |
| No había ninguna ayuda publicada | [Centro de ayuda](/help) |

Ver [FAQ y Mensajes](FAQ-y-Mensajes.md).

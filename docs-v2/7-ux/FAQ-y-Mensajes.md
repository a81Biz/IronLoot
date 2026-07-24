# FAQ, Mensajes y Glosario para Usuarios — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia |
| **Fuente** | `audit/raw/B` (excepciones/errores), `D` (flujos), Diccionario Maestro |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 04-App-Flow, 09-Security |
| **Código usado** | excepciones de `auth`, `bids`, `wallet`, `disputes` |
| **Nivel de confianza** | Alto |

## 1. Preguntas frecuentes

**¿Por qué no puedo iniciar sesión tras registrarme?**
Debes **verificar tu email** primero (enlace del correo). Cuentas suspendidas/baneadas no pueden acceder.

**¿Por qué se "congelan" fondos al pujar?**
Al pujar se **retienen** fondos por el importe. Si te superan, se **liberan** automáticamente; si ganas, se cobran al cierre.

**¿Cuál es el límite de retiro?**
5.000 MXN por día, y necesitas un método de pago registrado.

**¿Cuánto cobra la plataforma?**
Una **comisión** sobre la venta (al vendedor). *(Nota interna: hoy conviven un 10% fijo y una comisión configurable — `AUD-005`.)*

**¿Puedo pujar desde la web ahora mismo?**
La interfaz de puja tiene una **limitación técnica actual** (`AUD-002`). El resto de funciones de navegación están disponibles.

**¿Cuánto tiempo tengo para abrir una disputa?**
**14 días** desde la entrega.

**¿Me pueden facturar (CFDI)?**
La facturación fiscal **aún no está disponible** (`AUD-016`).

**¿Qué es el "soft-close"?**
Si alguien puja en los últimos segundos, la subasta se **extiende** un poco para dar oportunidad de responder (anti-sniping).

## 2. Mensajes de error frecuentes

| Mensaje / código | Significado | Qué hacer |
|---|---|---|
| `USER_NOT_VERIFIED` (403) | Email sin verificar | Revisa tu correo / reenvía verificación |
| `BID_TOO_LOW` (400) | Puja ≤ precio actual | Puja por un importe mayor |
| `BID_ON_OWN_AUCTION` (400) | Intentas pujar tu propia subasta | No permitido |
| `PaymentMismatchException` | El monto pagado no coincide con el solicitado | Reintenta el depósito con el importe correcto |
| `DISPUTE_WINDOW_EXPIRED` | Pasaron los 14 días | La disputa ya no puede abrirse |
| Fondos insuficientes | Saldo disponible < importe | Deposita antes de pujar |
| 429 (rate limit) | Demasiados intentos | Espera un momento y reintenta |

## 3. Estados que verás

| Entidad | Estados |
|---|---|
| Cuenta | Pendiente de verificación · Activa · Suspendida · Baneada |
| Subasta | Borrador · Publicada · Activa · Cerrada · Cancelada · Suspendida · En moderación |
| Orden | Pendiente de pago · Pagada · Enviada · Entregada · Cancelada · Reembolsada |
| Envío | Pendiente · Enviado · Entregado · Devuelto |
| Disputa | Abierta · En mediación · Resuelta · Cerrada |

## 4. Glosario para usuarios

| Término | En simple |
|---|---|
| Wallet / Monedero | Tu saldo dentro de IronLoot |
| Fondos retenidos | Dinero bloqueado por tus pujas activas |
| Puja | Tu oferta sobre una subasta |
| Soft-close | Extensión automática si hay pujas de último segundo |
| Orden | Tu compra confirmada tras ganar |
| Disputa | Reclamo tras la entrega (14 días) |
| Reembolso | Devolución de dinero a tu wallet |
| KYC | Verificación de identidad para vender |
| CFDI | Factura fiscal mexicana (no disponible aún) |
| Comisión | Lo que cobra la plataforma al vendedor por venta |

> Glosario técnico completo: [Diccionario Maestro](../transversal/Diccionario-Maestro.md).

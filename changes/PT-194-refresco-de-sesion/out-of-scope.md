# PT-194 — out-of-scope.md

## 1. Rotación del refresh token

Hoy no rota: `/auth/refresh` devuelve el mismo. Rotar permite **detectar el robo** —si aparece un token
ya usado, alguien lo copió—, pero introduce una carrera real con peticiones concurrentes y obliga a una
ventana de gracia.

**Es un cambio de seguridad con su propio análisis, no un efecto colateral de cablear el refresco.**

> Cuando se haga, **la decisión D-2 de `design.md` deja de valer**: la deduplicación por proceso pasa
> de ser una optimización a ser una necesidad de corrección. Queda escrito ahí para que se encuentre.

## 2. Refresco silencioso en el navegador

Un temporizador en JS que refresque antes de expirar. **No hace falta**: el BFF lo hace en servidor y
no expone el refresh token. Añadiría superficie en el cliente para algo ya resuelto.

## 3. Gestión de sesiones para el usuario

«Cerrar sesión en otros dispositivos», ver sesiones activas. La tabla lo soporta —`ipAddress`,
`userAgent`, `revokedAt`—, pero es **funcionalidad de producto**, no esta deuda.

## 4. ADMIN

Tiene su propio cliente y su propio refresco (`admin-api-client.service.ts`). **No se toca.**

## 5. BASE

Sitio público; sus páginas no exigen sesión. Sí **escribe** las cookies al iniciar sesión y eso ya
funciona.

## 6. Cambiar `JWT_ACCESS_EXPIRY`

Los quince minutos dejan de doler cuando el refresco funciona. Subirlo **enmascararía** el defecto, y
además **empeoraría la seguridad**: un token robado valdría más tiempo, y el sistema perdería su única
comprobación de revocación, que ocurre justo en el refresco.

## 7. Unificar `apiGet` con el proxy

`apiGet` (SSR) y el proxy (navegador) hacen lo mismo por caminos distintos. Unificarlos sería un
refactor razonable **y otro PT**: toca 28 llamadas y no lo pide esta deuda.

## 8. `apiGet` sigue devolviendo `null` ante un fallo real

Se le añade traza (PT-194.6), **no se le cambia la firma**. Cambiarla obliga a revisar 28 llamadas y
decidir qué hace cada página ante un error — eso es un PT con criterios propios.

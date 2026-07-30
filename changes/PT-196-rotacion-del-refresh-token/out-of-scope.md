# PT-196 — out-of-scope.md

## 1. Avisar al usuario de que hubo un robo

Se detecta y se registra; **no se le dice nada**. Notificarlo exige decidir por qué canal, con qué
texto y qué se le pide que haga — y un aviso mal redactado ante un falso positivo asusta más de lo que
ayuda. Es producto, no esta deuda.

## 2. Historia completa de rotaciones

Se recuerda **un** token hacia atrás (D-1). Guardar la cadena entera exigiría una fila por refresco —
crecimiento no acotado— para una forensia que llega tarde: cuando detectas el reuso, la acción es la
misma mires una rotación atrás o veinte.

**Consecuencia aceptada**: un robo que llega tras dos rotaciones del legítimo se lee como sesión
caducada. **Se detecta menos, no se falla más.**

## 3. Gestión de sesiones para el usuario

«Cerrar sesión en otros dispositivos», ver sesiones activas. La tabla lo soporta desde siempre. Sigue
fuera, como en PT-194.

## 4. ADMIN

Tiene su propio cliente y su propio refresco. No se toca.

## 5. Acortar `JWT_REFRESH_EXPIRY`

Rotar y acortar son decisiones **independientes**. Hacerlas juntas impediría saber cuál mejoró qué — y
la segunda es una decisión de producto sobre cuánto dura una sesión, no de seguridad.

## 6. Vincular la sesión a la IP o al `userAgent`

Suena a refuerzo y **rompe usuarios legítimos**: móviles que cambian de red, proxies corporativos,
operadores con IP rotatoria. Además da una sensación de seguridad que no corresponde: un atacante que
tiene la cookie normalmente puede imitar el `userAgent`.

Se usan como **datos del evento** (D-4) —para investigar—, no como criterio para aceptar o rechazar.

## 7. Rotar también el token de acceso

No aplica: el access token no se almacena ni se revoca, caduca solo a los 15 minutos. Rotarlo no
significa nada.

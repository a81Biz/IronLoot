# ENRICHMENT.md — PT-194: cablear el refresco de sesión (TD-025)

**STATE 1-E.** `FEATURE` — La sesión del portal privado deja de durar quince minutos.

**Fecha**: 2026-07-30
**Origen**: `TD-025`, abierta al medir `AUD-035` en PT-192. Petición del humano: *«vamos ahora con
TD-025»*.
**Complejidad**: STANDARD.
**Estado**: esperando ACK. **Cero líneas de `src/` tocadas.**

> El enrichment anterior (**PT-174**, cerrado) se conserva en `archive/ENRICHMENT-PT-174.md`.

---

## El problema, en una frase

**El portal privado echa al usuario a los quince minutos**, aunque el sistema tenga escrito y guardado
todo lo necesario para que la sesión dure siete días.

---

## Lo medido, que es distinto de lo que dice la deuda

`TD-025` dice *«el refresco existe y nadie lo llama»*. El reparto real cambia el tamaño del trabajo:

| Pieza | Estado | Qué se comprobó |
|---|---|---|
| `POST /api/v1/auth/refresh` | **completo** | Valida sesión, revocación, expiración y estado del usuario; devuelve access token nuevo con **perfil fresco** |
| Tabla `sessions` | **completa** | `refreshToken @unique`, `expiresAt`, `revokedAt`, `lastUsedAt`, `ipAddress`, `userAgent` |
| `logout` | **completo** | Revoca la sesión, o **todas** las del usuario |
| BASE — escribir cookies al refrescar | **completo** | `/api/v1/auth/refresh` ya está en `AUTH_TOKEN_ENDPOINTS` |
| **CLIENT — intentar el refresco** | **ausente** | Ni el guard ni el proxy lo intentan |

**No hay que construir el refresco: hay que llamarlo.** El trabajo es de integración en el CLIENT, no
de autenticación en el API — y eso baja mucho el riesgo, porque no se toca ni la firma ni la validación
de tokens.

**Dato que condiciona el diseño:** el endpoint **no rota** el refresh token; devuelve el mismo. Eso hace
que varias llamadas simultáneas sean inocuas entre sí — ninguna invalida a las otras. Es lo que
convierte el caso concurrente en un problema de eficiencia y no de corrección.

---

## Dónde falta, exactamente

Hay **dos** caminos por los que el portal llega al API, y hoy ninguno refresca:

**(a) Navegación de página** — `ClientAuthGuard`. Verifica el JWT localmente; si falla, borra la cookie
y manda al login. Es donde el usuario ve el efecto: *«acabo de entrar y me ha echado»*.

**(b) Llamada del navegador** — el proxy BFF (`/api/*`). Inyecta `Authorization` desde la cookie y
**deja pasar el 401 tal cual**. El JS de página recibe un 401 que no sabe interpretar.

Cablear sólo (a) deja el portal a medias: la página carga y sus llamadas fallan. Cablear sólo (b) deja
la navegación rota. **Los dos, o ninguno.**

---

## Criterios de aceptación

**CA-1 — La sesión sobrevive a la expiración del access token.**
Con `JWT_ACCESS_EXPIRY=15m` y un refresh token válido, una navegación a una página privada **17
minutos** después de iniciar sesión la sirve, sin pasar por el login.

**CA-2 — Y la llamada del navegador también.**
En esas mismas condiciones, un `fetch` a `/api/v1/...` desde el JS de página devuelve **200**, no 401.

**CA-3 — La cookie se actualiza con el token nuevo.**
Tras un refresco, `access_token` lleva el token nuevo, con `maxAge` derivado de `JWT_ACCESS_EXPIRY`
(PT-192). La petición siguiente **no vuelve a refrescar**.

**CA-4 — Un refresco fallido cierra la sesión, y no reintenta.**
Sesión revocada, expirada o usuario suspendido → se borran **las dos** cookies y se redirige al login.
**Nunca un bucle**: como máximo **un** intento de refresco por petición.

**CA-5 — Sin refresh token no hay intento.**
Si no hay cookie `refresh_token`, el comportamiento es el de hoy: al login, directo. Sin llamada al API.

**CA-6 — El perfil se actualiza al refrescar.**
El endpoint devuelve el perfil fresco y el token nuevo lo lleva. Un usuario que se hace vendedor lo ve
en el siguiente refresco sin volver a entrar.

**CA-7 — Peticiones concurrentes no producen N refrescos.**
Una carga de página que dispara varias llamadas con el token expirado produce **un** refresco, no uno
por llamada.

**CA-8 — El logout sigue cerrando de verdad.**
Tras cerrar sesión, un refresco con ese token devuelve 401 y **no** revive la sesión.

---

## Escenarios de prueba

**Camino feliz**
1. Login → esperar a que expire el access token → navegar a `/dashboard` → **200**, sin login.
2. Lo mismo con un `fetch` a `/api/v1/wallet/balance` → **200**.
3. Token válido y sin expirar → **no** se llama a `/auth/refresh` (se cuenta).

**Bordes**
4. `refresh_token` presente pero **revocado** (logout previo) → login, cookies borradas.
5. `refresh_token` **expirado** (>7 d) → login, cookies borradas.
6. Usuario **suspendido** entre medias → login. El estado se comprueba en el API, no en el CLIENT.
7. **Sin** cookie `refresh_token` → login, y **cero** llamadas al API.
8. Cinco llamadas concurrentes con el token expirado → **un** refresco.

**Fallo**
9. El API **no responde** al refrescar (caído o lento) → login; ni página en blanco ni espera
   indefinida. Toda llamada a un tercero declara su tope (PT-183/PT-184) — aquí el tercero es el API.
10. El refresco devuelve **500** → se trata como fallo, no como éxito silencioso.

**Control**
11. Un `access_token` **manipulado** sigue rechazándose: refrescar no puede convertirse en una vía para
    aceptar un token inválido.

---

## NFR

- **Seguridad**: el `refresh_token` no sale nunca al navegador en JS — sigue siendo `httpOnly`. El
  refresco ocurre **servidor a servidor** desde el CLIENT.
- **Latencia**: como mucho **una** llamada extra por petición, y sólo cuando el token expiró.
- **Observabilidad**: cada refresco deja traza con su resultado. El API ya cuenta
  `auth_refresh_success` / `auth_refresh_failed` con motivo; hay que poder distinguir «no se intentó»
  de «se intentó y falló».
- **Tope de espera**: el refresco declara el suyo. Un refresco colgado no puede colgar la página.

---

## Fuera de alcance, explícito

- **Rotación del refresh token.** Hoy no rota. Rotar detecta el robo del token, pero introduce una
  carrera real con peticiones concurrentes y obliga a una ventana de gracia. **Es un cambio de
  seguridad con su propio análisis**, no un efecto colateral de cablear el refresco. Si se decide, va
  en su PT y con su ADR.
- **Refresco silencioso en el navegador** (temporizador en JS). No hace falta: el BFF lo hace en
  servidor y no expone nada.
- **Gestión de sesiones para el usuario** («cerrar sesión en otros dispositivos»). La tabla lo soporta
  —`ipAddress`, `userAgent`, `revokedAt`—, pero es funcionalidad de producto, no esta deuda.
- **ADMIN.** Tiene su propio cliente y su propio refresco (`admin-api-client.service.ts`). No se toca.
- **BASE.** Es el sitio público; sus páginas no exigen sesión.
- **Cambiar `JWT_ACCESS_EXPIRY`.** Los 15 minutos dejan de doler cuando el refresco funciona; tocarlos
  ahora sería enmascarar el defecto en vez de arreglarlo.

---

## Confianza

- **Arquitectura: 95 %.** Los dos puntos de integración están localizados y medidos; el API no se toca.
- **Implementación: 80 %.** Lo que baja el número es **CA-7** (concurrencia): en un proceso SSR hay que
  compartir la promesa del refresco en vuelo, y hay que decidir su alcance —¿por usuario? ¿por refresh
  token?— y qué ocurre con varias instancias del CLIENT. Eso se resuelve en STATE 2.

---

## Riesgos, dichos ahora

**1. Un bucle de refresco.** Si un refresco fallido no cierra la sesión, cada petición lo reintenta y el
usuario queda atrapado, con carga sobre el API en cada navegación. `CA-4` existe por eso, y su prueba es
de las que hay que **ver fallar**.

**2. Aceptar un token que debería rechazarse.** El refresco añade una vía a la sesión, y una vía nueva a
la sesión se prueba en los dos sentidos. `CA-11` cubre eso.

**3. Que el arreglo tape el síntoma.** Con el refresco funcionando, un `JWT_SECRET` mal puesto o una
sesión revocada dejarían de verse como «me echa» y pasarían a verse como… nada. Por eso la
observabilidad está en los NFR y no como añadido: **hay que poder distinguir «no se intentó» de «se
intentó y falló»**.

---

**STOP — FDGE STATE 1-E.** Esperando ACK humano antes de pasar a STATE 2 (estrategia).

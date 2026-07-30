# PT-194 — Self-Review (FDGE STATE 5)

**Objetivo:** cablear el refresco de sesión (`TD-025`). La sesión efectiva del portal privado pasa de
**quince minutos** a lo que dure el refresh token.

---

## Las 11 tareas

| Tarea | Qué | Estado |
|---|---|---|
| 1 | `refrescar-sesion.ts` — único sitio que llama a `/auth/refresh` | ✅ |
| 2 | Deduplicación en vuelo (`CA-7`) | ✅ |
| 3 | Tope de espera | ✅ |
| 4 | El guard refresca, y sólo ante expiración | ✅ |
| 5 | El token nuevo llega a `apiGet` de la misma petición | ✅ |
| 6 | `apiGet` deja de confundir 401 con «sin datos» | ✅ |
| 7 | El proxy reintenta una vez | ✅ |
| 8 | El proxy no rompe lo que ya funcionaba | ✅ |
| 9 | `vida-de-sesion.ts` en el CLIENT | ✅ |
| 10 | Guarda: el refresco no relaja la verificación | ✅ |
| 11 | Evidencia y registros | ✅ |

## Verificación

- **API**: 1082 pruebas / 134 suites.
- **CLIENT**: 134 pruebas / 11 suites (eran 103 en 8). **31 casos nuevos.**
- Typecheck del CLIENT limpio.

## Tests-first, con el RED anotado

| Prueba | RED verificado |
|---|---|
| `refrescar-sesion.spec.ts` | suite entera fallando: el módulo no existía |
| `guard-refresca-una-vez.spec.ts` | **9 de 10** fallando; el que pasaba era `AC-03`, que sólo comprueba que los tokens de prueba son lo que dicen |
| `proxy-reintenta-una-vez.spec.ts` | módulo inexistente |

## Cada guarda vista fallar por su propio motivo

| Sabotaje | Qué cae |
|---|---|
| Quitar la comprobación de `TokenExpiredError` | `C1` de la guarda del API **y** los dos casos de token falsificado del CLIENT |
| Borrar sólo `access_token` al cerrar sesión | `C2` de la guarda del API |

## Lo que salió mal por el camino, porque es evidencia

**1. Un sabotaje que no se aplicó pasó por una guarda que funciona.** El primer intento de sabotear la
comprobación de seguridad usaba un `replace` que **no casaba** —prettier había partido la línea en
dos— y el script no lo comprobaba. Resultado: `6/6 en verde` con el sabotaje supuestamente aplicado, y
por un momento pareció que la guarda no servía.

**Un sabotaje que no aplica es indistinguible de una guarda que funciona.** Desde ahora el script
afirma que el reemplazo ocurrió antes de correr nada — es la misma lección que RULE-26 aplica al
código, trasladada a la herramienta que lo verifica.

**2. Un doble de prueba que modelaba mal el entorno.** `C3` del proxy fallaba porque mi doble
inicializaba `res.statusCode` en 200, cuando `responseInterceptor` **ya copia el estado** de la
respuesta antes de llamar al interceptor. No era un defecto del código: la prueba medía otra cosa.
Corregido el doble, además mejoró la comprobación — ahora verifica que el 401 **se conserva**.

## Decisiones que quedaron escritas donde se leen

- **Sólo `TokenExpiredError` refresca.** Hacerlo ante cualquier fallo de `verify` bastaría para que un
  `access_token` basura con una cookie de refresco válida obtuviera un token nuevo. Es la decisión de
  seguridad del PT y tiene guarda propia.
- **`null` ≠ `throw`.** «La sesión murió» y «no pude preguntarlo» llevan al mismo sitio y no significan
  lo mismo. Colapsarlos haría indistinguible «los usuarios se salen» de «el API está caído».
- **Un intento por petición**, en los dos caminos. Es la barrera contra el bucle.
- **La deduplicación es por proceso**, y su criterio de revocación está escrito: *el día que se rote el
  refresh token esta decisión deja de valer*.

## Lo que este PT NO hace, y conviene tener presente

**La rotación del refresh token sigue fuera.** Un token robado sirve 7 días. Era el estado anterior y
no empeora, pero ahora que el refresco se usa de verdad, la rotación gana valor — es el candidato
natural al siguiente PT de este camino.

## Estado

Toca el camino de autenticación, así que va a **`VALIDATION_PENDING`** aunque sea FEATURE. El agente no
lo cierra.

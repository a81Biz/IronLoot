# PT-194 — design.md

**Decisiones de arquitectura y su porqué.** Entrada: `PLAN_ACTUAL.md` (STATE 2), con ACK.

---

## D-1 — Una sola pieza llama a `/auth/refresh`

`src/apps/client/src/common/auth/refrescar-sesion.ts`. **Es el único sitio del CLIENT que conoce esa
ruta.**

```ts
type Tokens = { accessToken: string; refreshToken: string };

// null  = la sesión murió (revocada, expirada, usuario suspendido) → cerrar sesión
// throw = el API no contestó → también se cierra sesión, pero es otra causa y se registra distinto
async function refrescarSesion(refreshToken: string): Promise<Tokens | null>
```

**Por qué `null` y `throw` son cosas distintas.** «La sesión ya no vale» y «no pude preguntarlo» llevan
a la misma acción —al login— pero **no significan lo mismo**, y el NFR de observabilidad exige poder
distinguirlas. Colapsarlas en `null` sería el `catch` mudo que el checkpoint D3 persigue: dentro de un
mes, «los usuarios se salen» sería indistinguible de «el API está caído».

**Por qué el módulo y no el guard.** Hay dos llamantes (guard y proxy). Si cada uno construye su
llamada, la deduplicación de `CA-7` es imposible y la ruta se escribe dos veces — es el defecto que
`AUD-011` y `PT-173` corrigieron en otro sitio: *dos puertas a lo mismo y sólo una con cerradura*.

---

## D-2 — La deduplicación en vuelo: un `Map`, y su alcance declarado

```ts
const enVuelo = new Map<string, Promise<Tokens | null>>();
```

La primera llamada con un refresh token dado crea la promesa; las simultáneas **se enganchan**; se
borra en `finally`. Cinco llamadas concurrentes → **una** al API (`CA-7`, `E-2`).

**La clave es el refresh token, no el usuario.** Un usuario puede tener varias sesiones (móvil,
escritorio) y son independientes: agrupar por usuario mezclaría dos sesiones distintas y una revocada
arrastraría a la otra.

**Alcance: por proceso.** Con N instancias del CLIENT, el peor caso son N llamadas en vez de N×M. Es
inocuo **porque el endpoint no rota el token**: ninguna llamada invalida a las otras. Compartirlo
exigiría Redis y un cerrojo distribuido **en el camino de la sesión** para ahorrar como mucho una
llamada. → declarado, no escondido.

> **Cuándo deja de valer esta decisión**: el día que se rote el refresh token. Entonces dos refrescos
> simultáneos **sí** se invalidarían, y haría falta estado compartido. Queda escrito aquí para que
> quien implemente la rotación lo encuentre.

---

## D-3 — El guard refresca una vez, y sólo ante expiración

`ClientAuthGuard` pasa de *verificar → fallar → login* a:

```
verify(token)
  ├─ ok                    → continuar
  ├─ TokenExpiredError     → ¿hay refresh_token?
  │                            ├─ no  → login (sin llamar al API)          CA-5
  │                            └─ sí  → refrescar (UNA vez)
  │                                       ├─ tokens → cookie nueva
  │                                       │           + req.cookies actualizado   ← D-4
  │                                       │           + continuar                 CA-1
  │                                       └─ null/throw → borrar las DOS cookies + login  CA-4
  └─ cualquier otro error  → login SIN refrescar                            CA-11
```

**La distinción de la última rama es la de seguridad.** `jwt.verify` falla por expiración, por firma
inválida, por token malformado… Refrescar ante *cualquier* fallo convertiría el refresco en una vía
para saltarse la verificación: bastaría con presentar un `access_token` basura y una cookie de refresco
válida. **Sólo `TokenExpiredError` refresca.**

**Un intento por petición**, sin reintento interno. Es la barrera contra el bucle (`CA-4`), y por eso
la lleva el flujo y no una variable de configuración.

---

## D-4 — El token nuevo tiene que llegar a `apiGet` de esa misma petición

Es la corrección que apareció en STATE 2 y la que evita el peor efecto secundario.

Tras refrescar, el guard escribe la cookie **y** actualiza `req.cookies.access_token` en memoria. Sin
eso, las **28** llamadas de `apiGet` de esa misma petición irían con el token viejo y la página
renderizaría **vacía** — sin error, sin traza, y con la cookie ya correcta para la siguiente. Un
arreglo que produce páginas en blanco es peor que el defecto que corrige.

`apiGet` no cambia de firma —28 usos— pero **deja de confundir un 401 con «sin datos»**: registra el
motivo. Es la mitad de observabilidad que exige el NFR.

---

## D-5 — El proxy: `responseInterceptor`, el patrón que BASE ya usa

Se pasa a `selfHandleResponse: true` con `responseInterceptor`, **misma librería y misma versión**
(`http-proxy-middleware ^3.0.7`) que BASE lleva meses usando. No se inventa un mecanismo.

- **401** + hay `refresh_token` → refrescar → **reintentar la petición una vez** con el token nuevo →
  escribir la cookie → devolver la respuesta buena (`CA-2`).
- Sin refresh token, refresco fallido, o el reintento vuelve a dar 401 → **devolver el 401**. Una
  llamada XHR no se redirige: el JS de página decide.

> **El riesgo de este cambio no es el 401: son los demás.** `selfHandleResponse` cambia cómo se
> devuelve **toda** respuesta, incluidas las correctas. `E-3` existe por eso.

**El proxy de `socket.io` no se toca.** Es otro middleware; la puja en vivo no pasa por aquí.

---

## D-6 — Tope de espera: el API es un tercero para el CLIENT

`refrescarSesion` declara el suyo, con `AbortSignal`, siguiendo `GATEWAY_TIMEOUTS_MS` (PT-183/PT-184).
**Un refresco colgado no puede colgar la página.**

**El valor se deriva, no se elige**: refrescar es una *consulta* —el equivalente de los 8 s de
pasarela—, no una operación que deje algo a medias si se abandona. Si el refresco se corta, no queda
nada inconsistente: el usuario va al login y su sesión en la BD sigue intacta.

---

## D-7 — De dónde sale el `maxAge` de la cookie nueva

`VIDA_ACCESO_MS` vive hoy en `src/apps/base/src/common/config/vida-de-sesion.ts` (PT-192). El CLIENT
lo necesita.

**Se copia el fichero al CLIENT, no se extrae a un paquete compartido.** Son **dos líneas de
configuración** y los dos SSR ya duplican `variable-obligatoria.ts` por la misma razón: crear un
paquete compartido para esto añadiría un `file:` más al monorepo y una dependencia de compilación
entre sitios que hoy son independientes.

**Lo que impide que diverjan** es que ambos leen **la misma variable de entorno** (`JWT_ACCESS_EXPIRY`),
no la copia del código. Si alguien cambia la variable, cambian los dos. → declarado como duplicación
consciente, con su motivo, no como descuido.

---

## Lo que NO se toca

`auth.service.ts`, `auth.controller.ts`, el modelo `Session`, la firma de tokens, BASE, ADMIN y el
proxy de `socket.io`. **Cero líneas del API.**

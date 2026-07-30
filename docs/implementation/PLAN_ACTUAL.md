# PLAN_ACTUAL — STATE 2: Clasificación y Estrategia

**Fecha**: 2026-07-30
**PT en el plan**: **PT-194** — cablear el refresco de sesión (`TD-025`)
**Tipo**: FEATURE · **Complejidad**: STANDARD
**Entrada**: `ENRICHMENT.md` (PT-194), con ACK del humano.
**Estado**: esperando ACK de esta estrategia. **Cero líneas de `src/` tocadas.**

---

## 1. Objetivo

Que la sesión del portal privado dure lo que dura el refresh token (**7 días**) en vez de lo que dura
el access token (**15 minutos**), llamando al refresco que ya existe — **sin tocar la autenticación
del API**.

---

## 2. Lo que la medición añadió al enrichment: son tres puntos, no dos

El enrichment identificó dos —el guard y el proxy—. Al diseñar apareció el tercero, y es consecuencia
del primero:

**(c) `apiGet()` en `app.controller.ts`** — 28 usos. Llama al API con el token de la cookie y
**se traga cualquier fallo devolviendo `null`**:

```ts
if (!res.ok) return null;
} catch { return null; }
```

Hoy no se nota porque el guard corre antes y rechaza el token expirado. **Pero en cuanto el guard
refresque, `req.cookies.access_token` seguirá teniendo el token viejo**, y las 28 llamadas de esa misma
petición irían con él: la página cargaría **vacía**, sin error, sin traza. Un arreglo que produce
páginas en blanco es peor que el defecto que corrige.

Es la familia de los `catch` mudos que el checkpoint D3 persigue: **el `null` de `apiGet` no distingue
«no hay datos» de «no me dejaron verlos»**.

---

## 3. Solución propuesta

### 3.1 Una sola pieza que refresca: `refrescarSesion()`

Un módulo en `src/apps/client/src/common/auth/` con **una** responsabilidad: dado un refresh token,
devolver tokens nuevos o decir que la sesión murió. Es el único sitio que llama a `/auth/refresh`.

```
refrescarSesion(refreshToken) -> { accessToken, refreshToken } | null
```

- `null` significa **sesión muerta** (revocada, expirada, usuario suspendido) → cerrar sesión.
- **Lanza** si el API no responde → se trata como fallo, no como éxito (lección de RULE-36).
- Declara su **tope de espera** (PT-183/PT-184): el API es un tercero para el CLIENT.

**Deduplicación en vuelo (CA-7)**: un `Map<refreshToken, Promise<...>>` a nivel de módulo. La primera
llamada crea la promesa; las simultáneas con el mismo token **se enganchan a ella**; se borra al
resolverse. Cinco llamadas concurrentes → **una** al API.

> **Por qué esto basta, y qué no cubre.** El endpoint **no rota** el refresh token, así que dos
> instancias del CLIENT refrescando a la vez no se invalidan: cada una obtiene un access token válido.
> La deduplicación es **por proceso** y eso es una limitación **declarada**, no un descuido: con N
> instancias el peor caso son N llamadas en lugar de N×M. Compartirla entre instancias exigiría Redis
> y un cerrojo distribuido para ahorrar como mucho una llamada — desproporcionado, y añade una
> dependencia al camino de la sesión.

### 3.2 El guard: refresca antes de rendirse

`ClientAuthGuard` pasa de *verificar → fallar → login* a *verificar → refrescar una vez → login*.

1. `jwt.verify` falla **por expiración** → intentar refresco. Cualquier otro fallo (firma inválida,
   token manipulado) → **al login directo, sin refrescar**. Distinguir importa: refrescar sobre un
   token falsificado convertiría el refresco en una vía para saltarse la verificación (**CA-11**).
2. Sin cookie `refresh_token` → login, **sin llamar al API** (`CA-5`).
3. Refresco bien → escribir la cookie nueva, **actualizar `req.cookies.access_token` en memoria** para
   que `apiGet` de esta misma petición use el token nuevo, y continuar.
4. Refresco mal → borrar **las dos** cookies y al login. **Un intento por petición, nunca dos**
   (`CA-4`).

### 3.3 El proxy: un reintento, y sólo uno

El proxy BFF pasa a `selfHandleResponse: true` con `responseInterceptor` — **exactamente el patrón que
BASE ya usa**, misma librería y misma versión (`http-proxy-middleware ^3.0.7`). No se inventa nada.

- Respuesta **401** del API + hay `refresh_token` → refrescar, **reintentar la petición una vez** con el
  token nuevo, escribir la cookie.
- Sin refresh token, o el refresco falla, o el reintento vuelve a dar 401 → **devolver el 401**. El JS
  de página decide; no se redirige una llamada XHR.

### 3.4 `apiGet` deja de ser mudo

No se cambia su firma —28 usos—, pero **el 401 deja de confundirse con «sin datos»**: se registra con
su motivo. La corrección del token la hace el guard (3.2.3); esto es la mitad de observabilidad que
exige el NFR, y es lo que permite distinguir «no se intentó» de «se intentó y falló».

---

## 4. Alternativas consideradas

**A. Refrescar sólo en el proxy, y que el guard confíe en la cookie.**
Más simple: un punto en vez de dos. **Rechazada**: el guard verifica el JWT él mismo, así que un token
expirado lo rechaza *antes* de que el proxy vea nada. La navegación seguiría rota.

**B. Que el guard no verifique y delegue todo al API.**
Elimina el problema de raíz: una sola autoridad. **Rechazada por coste**: una llamada al API en *cada*
navegación, incluso con el token fresco. Hoy la verificación local es gratis. Contradice el NFR de
latencia.

**C. Refresco silencioso en el navegador** (temporizador en JS que llama a `/auth/refresh`).
**Rechazada**: ya está fuera de alcance en el enrichment. Añade superficie en el cliente para algo que
el BFF resuelve en servidor sin exponer nada.

**D. Deduplicar con Redis, compartido entre instancias.**
**Rechazada por desproporción**: sin rotación, N llamadas concurrentes son inocuas. Se pagaría una
dependencia nueva **en el camino de la sesión** para ahorrar como mucho una llamada por instancia. Si
algún día se rota el token, esta decisión se revisa — y entonces hará falta de verdad.

**E. Subir `JWT_ACCESS_EXPIRY` a 7 días y no refrescar.**
**Rechazada, y conviene decir por qué**: haría desaparecer el síntoma y **empeoraría la seguridad** —
un token robado valdría una semana, y el sistema perdería la única comprobación de revocación que
tiene, que ocurre justo en el refresco. Sería enmascarar el defecto.

---

## 5. Dependencias

- `POST /api/v1/auth/refresh` — **existe y no se toca**.
- `http-proxy-middleware ^3.0.7` con `responseInterceptor` — **ya está**, BASE lo usa.
- `VIDA_ACCESO_MS` (PT-192) para el `maxAge` de la cookie nueva. **Vive en BASE**: hay que decidir si se
  duplica en CLIENT o se extrae. → tarea explícita en STATE 3.
- `JWT_SECRET` obligatorio en CLIENT (PT-192) — ya cerrado.

---

## 6. Restricciones

- **No se toca el API.** Ni firma, ni validación, ni el modelo `Session`.
- **No se rota el refresh token.** Fuera de alcance, declarado.
- El `refresh_token` **no sale al navegador en JS**: sigue `httpOnly` y el refresco es servidor a
  servidor.
- **Un intento de refresco por petición.** Es la barrera contra el bucle.
- Sin dependencias nuevas.

---

## 7. Análisis de regresión (obligatorio)

**Qué puede romperse, y cómo se comprueba:**

| Riesgo | Por qué | Cómo se cubre |
|---|---|---|
| **Bucle de refresco** | Un refresco fallido que no cierra sesión se reintenta en cada petición | `CA-4` + una prueba que cuenta intentos. **De las que hay que ver fallar** |
| **Páginas en blanco** | El guard refresca y `apiGet` sigue con el token viejo → 28 llamadas fallidas mudas | §3.2.3 actualiza `req.cookies` en memoria; prueba con token expirado que comprueba que los datos llegan |
| **Aceptar un token manipulado** | Refrescar sobre cualquier fallo de `verify`, no sólo expiración | §3.2.1 distingue el motivo; `CA-11` lo prueba en los dos sentidos |
| **Romper el proxy** | Pasar a `selfHandleResponse` cambia cómo se devuelve **toda** respuesta, no sólo los 401 | Se copia el patrón de BASE, que lleva meses en producción. Prueba de que un 200 normal sigue llegando intacto (cuerpo y cabeceras) |
| **Socket.io** | El proxy de `/socket.io` es **otro** middleware y no se toca | Prueba de que la puja en vivo sigue conectando |
| **El logout deja de cerrar** | Si el refresco reviviera una sesión revocada | `CA-8`; el API ya lo comprueba — la prueba verifica que el CLIENT no lo esquiva |
| **Latencia en el camino feliz** | Que se refresque con el token válido | Prueba que **cuenta** las llamadas a `/auth/refresh` y exige **cero** con token fresco |

**Flujos afectados**: toda página privada del CLIENT (`@UseGuards(ClientAuthGuard)`), todas las llamadas
del navegador por `/api/*`, y las 28 de `apiGet`. **No afectados**: BASE, ADMIN, el API, y el proxy de
`socket.io`.

---

## 8. Criterios de éxito

Los **8 CA** del enrichment, cada uno con prueba. Y tres que son de este plan:

- **E-1**: con token fresco, **cero** llamadas a `/auth/refresh` (se cuenta, no se supone).
- **E-2**: cinco llamadas concurrentes con token expirado → **una** llamada al API.
- **E-3**: una respuesta 200 normal atraviesa el proxy **idéntica** tras el cambio a
  `selfHandleResponse` — cuerpo y cabeceras.

---

## 9. Lo que este plan NO resuelve, dicho ahora

- **Varias instancias del CLIENT** deduplican por separado. Declarado en §3.1 con su motivo.
- **El refresco no rota**, así que un refresh token robado sirve 7 días. Es el estado actual y su
  cambio tiene su propio PT.
- **`apiGet` sigue devolviendo `null`** ante un fallo real del API. Se le añade traza, no se le cambia
  la firma: tocar 28 llamadas para eso es otro trabajo.

---

**STOP — FDGE STATE 2.** Esperando ACK antes de STATE 3 (Proposal Package + Proposal Gate).

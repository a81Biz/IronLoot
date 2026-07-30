# PT-196 — design.md

**Decisiones y su porqué.** Entrada: `PLAN_ACTUAL.md` (STATE 2), con ACK.

---

## D-1 — El esquema: dos columnas y una fecha

```prisma
model Session {
  refreshToken         String    @unique @map("refresh_token")
  previousRefreshToken String?   @unique @map("previous_refresh_token")   // NUEVO
  rotatedAt            DateTime? @map("rotated_at") @db.Timestamptz       // NUEVO
  // … el resto, sin cambios
}
```

**Las dos nuevas son anulables**, y eso es lo que hace la migración aditiva: las sesiones existentes
quedan con `previousRefreshToken = null` y **rotan en su primer refresco**. Nadie pierde la sesión al
desplegar (`CA-8`).

**`previousRefreshToken` lleva `@unique`** por el mismo motivo que el actual: sin él, dos sesiones
podrían compartir «anterior» y la búsqueda sería ambigua — se revocaría la sesión equivocada.

**No hay `familyId`.** La familia es la fila: nace en el login, muere en el logout o en la revocación.
Revocar es escribir `revokedAt` donde ya estás.

---

## D-2 — Los cuatro casos, resueltos en una consulta

`refreshToken(token)` busca **una** sesión con `refreshToken = token OR previousRefreshToken = token`
y decide:

```
sesión no encontrada          → TokenInvalidException            (como hoy)
revocada / expirada / usuario no válido → como hoy
token === refreshToken        → ROTAR: previous ← actual, actual ← nuevo, rotatedAt ← ahora
token === previousRefreshToken
   ├─ rotatedAt + GRACIA > ahora → devolver los VIGENTES, sin rotar     ← carrera
   └─ si no                      → REUSO: revocar la sesión y lanzar    ← robo
```

**El orden importa.** La comprobación de revocación y expiración va **antes** que la de reuso: una
sesión ya revocada no vuelve a disparar un evento de seguridad cada vez que alguien reintenta con el
token viejo, o el registro se llenaría de ruido justo cuando hay que leerlo.

---

## D-3 — Rotar y entregar, una sola transacción

El token nuevo **se genera y se escribe antes de devolverse**, dentro de `$transaction`. Si la
escritura falla, no se entrega nada y el token anterior sigue siendo el vigente (`CA-7`, `CA-10`).

Lo contrario —entregar y luego escribir— dejaría al usuario con un token que la base no reconoce: la
sesión seguiría viva en la base y muerta en el navegador. Es el mismo principio que ADR-038 aplica al
dinero: *un ciclo no está cerrado hasta que llegó a su destino*.

**La rotación va con `SELECT … FOR UPDATE` sobre la fila** (RULE-24 aplicada a la sesión). Sin bloqueo,
dos refrescos concurrentes con el token vigente podrían leer el mismo estado y escribir dos rotaciones:
la segunda pisaría a la primera y **el token que se entregó primero dejaría de existir** — un usuario
expulsado por su propia concurrencia.

---

## D-4 — El reuso no es un 401: es un evento de seguridad

Cuando se detecta, se registra con:

- el `ipAddress` y el `userAgent` **de la sesión** (quién la abrió),
- el `ipAddress` y el `userAgent` **de la presentación** (quién usó el token rotado),
- el id de sesión y el usuario.

**Son las dos puntas, y por eso vale.** Sin ellas queda «hubo un reuso» y no se puede investigar. Con
ellas se ve si el token viajó de un dispositivo a otro.

> **Si esto se registrara como un 401 más, el PT habría pagado todo su coste sin obtener su beneficio.**
> El punto de rotar no es que el token caduque antes: es **saber que hubo un robo**.

---

## D-5 — El CLIENT persiste el token nuevo, por los dos caminos

Hoy el guard y el interceptor escriben **sólo** `access_token`. Los dos tienen que escribir también
`refresh_token`, con `VIDA_REFRESCO_MS`.

`refrescarSesion()` **ya devuelve** el token nuevo (PT-194): no hay que cambiar la pieza, sólo usar lo
que devuelve.

**Se extrae un helper** —`escribirCookiesDeSesion(res, tokens)`— porque son dos llamantes y las
opciones de cookie tienen que coincidir **exactamente** con las de BASE: un `sameSite` o un `domain`
distinto crearía una segunda cookie en vez de sustituir la primera, y el navegador enviaría las dos.
Ese fallo se ve como «a veces funciona», que es el peor de diagnosticar.

---

## D-6 — El orden de despliegue, que es parte del diseño

```
1. CLIENT persiste el token nuevo   ← se despliega y se verifica
2. El API empieza a rotar
```

**Invertirlo expulsa a todos los usuarios en su segundo refresco.** Por eso las tareas van en ese
orden y la rotación llega **al final**, no porque sea lo más difícil sino porque es lo que no se puede
adelantar.

El paso 1 es **inocuo por sí solo**: escribir una cookie con el mismo valor que ya tenía no cambia
nada. Eso es lo que lo hace desplegable por separado.

---

## D-7 — `ROTATION_GRACE_SEC` = 30, derivado

El peor caso a cubrir es un refresco que agota su tope (`TOPE_REFRESCO_MS = 8_000`, PT-194) más una
segunda petición que llega justo antes de que termine, con otros 8 s por delante. **30 s son ~3,75×**
esa cota: holgado sobre el peor caso realista, despreciable frente a los 7 días del token.

Va como variable, no como literal, **y sin reserva** (RULE-17): un valor por defecto silencioso aquí
significaría o bien expulsar usuarios por carreras (gracia 0) o bien una ventana más ancha de lo que
nadie decidió.

---

## Lo que NO se toca

Login, registro, tokens de acceso, ADMIN, BASE, y `JWT_REFRESH_EXPIRY`. **Rotar y acortar la vida del
token son decisiones independientes**; mezclarlas impediría saber cuál mejoró qué.

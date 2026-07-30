# ENRICHMENT.md — PT-196: rotación del refresh token

**STATE 1-E.** `FEATURE` — Un refresh token robado deja de servir siete días.

**Fecha**: 2026-07-30
**Origen**: `changes/PT-194-refresco-de-sesion/out-of-scope.md § 1`. Petición del humano: *«pasemos a
la rotación del refresh token y resolver lo necesario»*.
**Complejidad**: **MAJOR** — toca autenticación **y el esquema de la base de datos**.
**Estado**: esperando ACK. **Cero líneas de `src/` tocadas.**

> El enrichment anterior (**PT-194**, cerrado) se conserva en `archive/ENRICHMENT-PT-194.md`.

---

## El problema, en una frase

**Un refresh token robado sirve siete días, y nadie se entera.** No hay forma de distinguir al usuario
legítimo del que le copió la cookie: los dos presentan el mismo token y los dos reciben sesión.

---

## Lo medido, y cambia el tamaño del trabajo

Antes de proponer nada, tres cosas que sólo se saben mirando:

### 1. Hoy el refresco **no toca** el token

`refreshToken()` actualiza `lastUsedAt` y devuelve `session.refreshToken` — *«keep same refresh
token»*, dice el comentario. La rotación es un cambio en el API, no una configuración.

### 2. **El CLIENT no guarda el token nuevo**, y eso convierte la rotación en una bomba

`refrescarSesion()` **ya devuelve** `refreshToken`, pero ni el guard ni el interceptor del proxy lo
escriben: los dos escriben **sólo** `access_token`.

Consecuencia si se rotara hoy sin tocar el CLIENT: el navegador conservaría el token **viejo**, el
siguiente refresco lo presentaría, y con detección de reuso eso significa *«alguien está usando un
token ya rotado»* → **se revocaría la sesión de todos los usuarios, en su segundo refresco**.

**La rotación sin persistencia no es una mejora a medias: es una regresión total.** Se dice aquí porque
el enunciado —«rotar el token»— no lo insinúa en absoluto.

### 3. El esquema no tiene dónde apoyar la detección de reuso

`Session` tiene `refreshToken @unique`, `expiresAt`, `revokedAt`, `lastUsedAt`, `ipAddress`,
`userAgent`. **No hay `replacedBy`, ni `familyId`, ni nada que enlace un token con el que lo sustituyó.**

Sin eso, un token rotado simplemente *no existe* y su presentación es indistinguible de una sesión
caducada. **La detección de reuso —que es el beneficio real de rotar— exige un cambio de esquema**, y
por tanto una migración (RULE-10).

---

## Criterios de aceptación

**CA-1 — Cada refresco entrega un token nuevo.**
Dos refrescos consecutivos devuelven `refreshToken` distintos.

**CA-2 — El token anterior deja de valer.**
Presentar el token ya rotado no devuelve sesión.

**CA-3 — El CLIENT persiste el token nuevo, por los dos caminos.**
Tras un refresco por navegación **y** tras uno por el proxy, la cookie `refresh_token` lleva el nuevo.
Sin esto, todo lo demás es una regresión (ver §2).

**CA-4 — Reusar un token rotado revoca la sesión entera.**
Es el punto de rotar. Si aparece un token ya sustituido, hay dos copias en circulación: se revoca **la
familia completa**, no sólo ese token. El legítimo también pierde la sesión — y **es correcto**: no se
sabe cuál de los dos es, y dejar viva la sesión sería dejar viva la del ladrón.

**CA-5 — Una ventana de gracia evita revocar por una carrera.**
Dos peticiones concurrentes del **mismo** navegador pueden llegar con el token viejo. Durante
`ROTATION_GRACE_SEC` desde la rotación, presentar el token anterior devuelve **el nuevo** en vez de
revocar. Pasada la ventana, `CA-4`.

**CA-6 — El logout sigue revocando, y ahora la familia.**
Cerrar sesión invalida el token actual y toda su cadena.

**CA-7 — Un refresco fallido no deja la sesión a medias.**
Rotar y persistir tienen que ser **una sola transacción**: si se entrega un token nuevo y no se guarda,
o se guarda y no se entrega, el usuario queda fuera con la sesión viva en la base.

**CA-8 — Las sesiones existentes siguen funcionando.**
La migración no puede echar a nadie: un token anterior a la rotación se acepta y **rota en su primer
uso**.

---

## Escenarios de prueba

**Camino feliz**
1. Refrescar → token nuevo ≠ anterior; la cookie del CLIENT lo lleva.
2. Refrescar otra vez con el nuevo → funciona.
3. Navegación y `fetch` del navegador: **los dos** persisten el token nuevo.

**Seguridad — lo que justifica el PT**
4. Refrescar, y volver a presentar el **token viejo** pasada la gracia → sesión revocada.
5. Tras esa revocación, el token **nuevo** tampoco vale: se revocó la familia.
6. El usuario legítimo, tras el robo, es enviado al login. **Es el resultado correcto.**

**Concurrencia**
7. Dos refrescos simultáneos con el mismo token dentro de la gracia → los dos reciben sesión, **sin**
   revocar.
8. Dos instancias del CLIENT, mismo token → igual que 7. Es el caso que la deduplicación por proceso
   de PT-194 **no** cubre, y por eso la gracia no es opcional.

**Migración**
9. Una sesión creada **antes** del cambio sigue valiendo, y rota en su primer refresco.

**Fallo**
10. Si la escritura de la rotación falla, el token anterior **sigue valiendo**: no se entrega uno nuevo
    sin haberlo guardado.

---

## NFR

- **Seguridad**: es el objetivo. Reusar un token rotado tiene que ser **detectable y ruidoso** — deja
  traza con `ipAddress` y `userAgent` de las dos presentaciones, que es lo que permite investigar.
- **Compatibilidad**: nadie pierde la sesión por desplegar (`CA-8`).
- **Atomicidad**: rotación y persistencia, una transacción (`CA-7`).
- **Observabilidad**: distinguir *«sesión caducada»*, *«token rotado dentro de la gracia»* y
  *«REUSO DETECTADO»*. El tercero es un evento de seguridad, no un 401 más.

---

## Fuera de alcance, explícito

- **Notificar al usuario** el robo detectado. Es funcionalidad de producto (correo, aviso en el panel)
  y depende de decidir qué se le dice.
- **Gestión de sesiones para el usuario** («cerrar en otros dispositivos»). Sigue fuera, como en
  PT-194.
- **ADMIN**: tiene su propio refresco. No se toca.
- **Reducir `JWT_REFRESH_EXPIRY`**: rotar y acortar son decisiones independientes; mezclarlas
  impediría saber cuál mejoró qué.
- **Vincular la sesión a la IP o al `userAgent`.** Suena a refuerzo y rompe usuarios legítimos —
  móviles que cambian de red, proxies corporativos. Si se quiere, con su propio análisis.

---

## Confianza

- **Arquitectura: 85 %.** La rotación es conocida; lo que baja el número es **elegir la ventana de
  gracia** y decidir si la familia se modela con `replacedById` (cadena) o con un `familyId` (grupo).
  Eso es STATE 2.
- **Implementación: 70 %.** Toca **esquema + API + los dos caminos del CLIENT**, y la migración tiene
  que ser compatible hacia atrás. Es el PT más arriesgado de la serie.

---

## Riesgos, dichos ahora

**1. Echar a todo el mundo.** Si el CLIENT no persiste el token nuevo —el hallazgo §2— la rotación
revoca a cada usuario en su segundo refresco. `CA-3` es el criterio que lo impide, y su prueba es de
las que hay que ver fallar.

**2. Revocar por una carrera.** Sin ventana de gracia, dos peticiones concurrentes del mismo navegador
parecen un robo. La deduplicación de PT-194 es **por proceso** y no cubre varias instancias.

**3. Que la migración eche a los que ya están dentro.** `CA-8`.

**4. Que el reuso se detecte y no se note.** Si el evento se registra como un 401 más, se habrá pagado
el coste de rotar sin obtener el beneficio: **saber que hubo un robo**.

# PLAN_ACTUAL — STATE 2: Clasificación y Estrategia

**Fecha**: 2026-07-30
**PT en el plan**: **PT-196** — rotación del refresh token
**Tipo**: FEATURE · **Complejidad**: **MAJOR** (toca autenticación **y** el esquema)
**Entrada**: `ENRICHMENT.md` (PT-196), con ACK.
**Estado**: esperando ACK de esta estrategia. **Cero líneas de `src/` tocadas.**

---

## 1. Objetivo

Que un refresh token robado deje de servir siete días, y que **su uso se note**.

---

## 2. La decisión principal: la familia es la sesión, no una cadena

El enrichment dejaba abierto si modelar la familia como **cadena** (`replacedById`) o como **grupo**
(`familyId`). Al diseñarlo aparece una tercera que es más simple que las dos, y mejor:

> **No se crea una fila por rotación. Se rota el token *dentro de* la fila de sesión, guardando el
> anterior.**

```prisma
model Session {
  refreshToken          String    @unique     // el vigente
  previousRefreshToken  String?   @unique     // el que acaba de sustituirse
  rotatedAt             DateTime?             // cuándo, para la ventana de gracia
  // … el resto, igual
}
```

Con eso, presentar un token cae en **exactamente cuatro** casos, y ninguno es ambiguo:

| Lo presentado | Cuándo | Qué pasa |
|---|---|---|
| `refreshToken` | siempre | Rota: el actual pasa a `previous`, se genera uno nuevo. **Éxito** |
| `previousRefreshToken` | dentro de la gracia | Devuelve los tokens **vigentes**, sin rotar. Es una carrera, no un robo |
| `previousRefreshToken` | pasada la gracia | **REUSO**: se revoca la sesión |
| ninguno de los dos | — | Sesión no encontrada, como hoy |

**Por qué es mejor que una cadena o un grupo.** «Familia» es un concepto que había que inventar: la
familia **ya existe** y es la fila de sesión —nace en el login y muere en el logout o en la
revocación—. Modelarla aparte añadiría un identificador que hay que propagar, y revocar exigiría
recorrer la cadena o consultar por grupo. Aquí **revocar es escribir `revokedAt` en la fila que ya
tienes delante**: O(1), sin recorrer nada.

**Y el esquema crece dos columnas y una fecha, todas anulables** → la migración es aditiva, que es lo
que hace posible `CA-8`.

**Lo que esta decisión cuesta**, dicho: sólo se recuerda **un** token hacia atrás. Si alguien roba el
token y el legítimo refresca **dos** veces antes de que el ladrón lo use, la presentación del ladrón
cae en «ninguno de los dos» y se lee como sesión caducada en vez de como robo. **Se detecta menos, no
se falla más** — y guardar la historia completa exigiría filas por rotación, con crecimiento no
acotado, para cubrir un caso que llega tarde de todas formas.

---

## 3. La ventana de gracia: 30 s, y se deriva

**Qué tiene que cubrir**: que dos peticiones del **mismo navegador** lleguen con el token viejo porque
la primera aún estaba refrescando. Es el caso 8 del enrichment, y la deduplicación de PT-194 **no lo
cubre** cuando hay varias instancias del CLIENT.

**De dónde sale el número**: el peor caso es un refresco que tarda lo máximo permitido. Ese tope está
declarado y medido — `TOPE_REFRESCO_MS = 8_000` (PT-194). Una segunda petición puede llegar justo
antes de que el primero termine, y su propio refresco tarda otros 8 s. **30 s son ~3,75× esa cota**:
holgado por encima del peor caso realista y **despreciable** frente a los 7 días del token.

No es una cifra bonita: es lo que ya espera el sistema de sí mismo, con margen. Va como
`ROTATION_GRACE_SEC`, no como literal.

---

## 4. Lo que hay que tocar, y en qué orden

### 4.1 Esquema (migración aditiva)

Dos columnas anulables y un índice único en `previousRefreshToken`. **Nadie pierde la sesión**: las
filas existentes tienen `previousRefreshToken = null` y rotan en su primer refresco (`CA-8`).

### 4.2 API — `refreshToken()` en una transacción

Buscar por `refreshToken` **o** por `previousRefreshToken`, decidir cuál de los cuatro casos es, y —si
toca rotar— escribir la rotación **y** devolver el token nuevo **en la misma transacción**. Si la
escritura falla, no se entrega token nuevo y el anterior sigue valiendo (`CA-7`, `CA-10`).

**El reuso no es un 401 más**: se registra como evento de seguridad, con el `ipAddress` y el
`userAgent` de **las dos** presentaciones. Sin eso se paga el coste de rotar y no se obtiene el
beneficio, que es *saber que hubo un robo* (riesgo 4 del enrichment).

### 4.3 CLIENT — persistir el token nuevo por los dos caminos

**Es el criterio que impide que este PT eche a todo el mundo.** Hoy el guard y el interceptor escriben
**sólo** `access_token`; los dos tienen que escribir también `refresh_token`, con `VIDA_REFRESCO_MS`.

`refrescarSesion()` **ya devuelve** el token — no hay que cambiarla. Lo que falta es usarlo.

> **Orden de despliegue, y es parte del plan.** `CA-3` va **antes** que la rotación: si el API rotara
> antes de que el CLIENT persista, cada usuario perdería la sesión en su segundo refresco. Se
> implementa CLIENT primero, se verifica, y **después** se activa la rotación.

---

## 5. Alternativas consideradas

**A. `familyId` en la sesión, una fila por rotación.**
Da la historia completa: se ve la cadena entera de un robo. **Rechazada** por crecimiento no acotado
—una fila por refresco, por usuario, por siete días— a cambio de una forensia que llega tarde: cuando
se detecta el reuso, la acción es la misma (revocar) mires una rotación atrás o veinte.

**B. `replacedById` encadenado.**
Igual de informativo que A y con el mismo coste de filas, más el de recorrer la cadena para revocar.
**Rechazada** por lo mismo, con peor revocación.

**C. Rotar sin detección de reuso** (token nuevo, el viejo simplemente deja de existir).
Más barato: ninguna columna nueva. **Rechazada porque tira el motivo del PT**: sin detección, un token
robado deja de servir en el siguiente refresco del legítimo… y hasta entonces sirve igual. Se pagaría
la complejidad de rotar sin obtener lo que la justifica.

**D. Sin ventana de gracia.**
Más simple y más estricto. **Rechazada por medición**: la deduplicación de PT-194 es **por proceso**, y
con varias instancias del CLIENT dos peticiones concurrentes del mismo navegador presentarían el mismo
token. Sin gracia, **una carga de página normal se leería como un robo** y el usuario sería expulsado.

**E. Vincular la sesión a IP o `userAgent`.**
Ya fuera de alcance en el enrichment, y conviene repetir por qué: rompe a usuarios legítimos —móviles
que cambian de red, proxies corporativos— y da una sensación de seguridad que no corresponde a lo que
protege.

---

## 6. Dependencias y restricciones

- **Migración obligatoria** (RULE-10). `db push` no sirve: no escribe `_prisma_migrations` y produce
  un esquema distinto (H-014).
- La base sombra de `audit:schema` hay que recrearla tras el reseteo (nota de `CLAUDE.md`).
- **No se toca** el modelo de tokens de acceso, ni ADMIN, ni BASE.
- `JWT_REFRESH_EXPIRY` **no se cambia**: rotar y acortar son decisiones independientes, y mezclarlas
  impediría saber cuál mejoró qué.

---

## 7. Análisis de regresión (obligatorio)

| Riesgo | Por qué | Cómo se cubre |
|---|---|---|
| **Echar a todos los usuarios** | Si el CLIENT no persiste el token nuevo, todos fallan en su segundo refresco | `CA-3` + orden de despliegue (§4.3). **Es el riesgo mayor del PT** |
| **Revocar por una carrera** | Dos peticiones concurrentes del mismo navegador con el token viejo | Ventana de gracia (§3) + prueba con dos refrescos simultáneos |
| **La migración echa a los que ya están dentro** | Columnas nuevas sobre sesiones vivas | Aditiva y anulable; prueba con una sesión creada antes (`CA-8`) |
| **Sesión a medias** | Entregar un token que no se guardó, o al revés | Una transacción (`CA-7`); prueba con la escritura fallando |
| **El reuso se detecta y no se nota** | Registrarlo como un 401 más | Evento de seguridad propio, con las dos IP/UA |
| **Romper el logout** | Ahora hay dos tokens que invalidar | `CA-6`; el `revokedAt` de la fila cubre los dos por construcción |
| **`previousRefreshToken` sin unicidad** | Dos sesiones con el mismo «anterior» harían la búsqueda ambigua | Índice `@unique`, como el actual |

**Flujos afectados**: `POST /auth/refresh`, `logout`, el guard y el interceptor del CLIENT, y la tabla
`sessions`. **No afectados**: login, registro, tokens de acceso, ADMIN, BASE.

---

## 8. Criterios de éxito

Los **8 CA** del enrichment, cada uno con prueba. Y dos de este plan:

- **E-1**: una sesión creada **antes** de la migración refresca sin error y queda rotada.
- **E-2**: dos refrescos simultáneos con el mismo token **no** revocan, y los dos reciben sesión.

---

## 9. Lo que este plan NO resuelve

- **Sólo se recuerda un token hacia atrás** (§2). Un robo que llega tras dos rotaciones del legítimo se
  lee como sesión caducada. Se detecta menos, no se falla más.
- **No se avisa al usuario** de que hubo un robo. Queda el evento en el registro; notificarlo es
  producto.
- **La gracia abre una ventana de 30 s** en la que el token anterior sigue sirviendo. Es el precio de
  no expulsar a nadie por una carrera, y es explícito.

---

**STOP — FDGE STATE 2.** Esperando ACK antes de STATE 3 (Proposal Package + Proposal Gate).

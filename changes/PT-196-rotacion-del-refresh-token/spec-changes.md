# PT-196 — spec-changes.md

## Esquema

**Dos columnas nuevas en `sessions`, ambas anulables:**

| Columna | Tipo | Para qué |
|---|---|---|
| `previous_refresh_token` | `varchar(255)` **único**, nulo | El token que acaba de sustituirse |
| `rotated_at` | `timestamptz`, nulo | Cuándo, para medir la ventana de gracia |

**Por migración, nunca `db push`** (RULE-10). `db push` no escribe `_prisma_migrations` y produce un
esquema distinto — es H-014, que costó que la unicidad de `payments.reference` no existiera durante
meses.

**Aditiva y compatible**: las sesiones vivas quedan con `previous_refresh_token = null` y rotan en su
primer refresco. Nadie pierde la sesión al desplegar.

## Contrato del API

**`POST /api/v1/auth/refresh` no cambia de forma**: mismos parámetros, misma respuesta. Lo que cambia
es que el `refreshToken` que devuelve **ya no es el mismo que se envió**.

Un cliente que ignore ese campo —como hacía el CLIENT hasta PT-196.2— **dejará de funcionar en su
segundo refresco**. Es la razón del orden de despliegue.

**Un código de error nuevo, y es lo que justifica el PT**: el reuso detectado no puede confundirse con
una sesión caducada. Son cosas distintas y una es un incidente de seguridad.

## Configuración

| Variable | Valor | Notas |
|---|---|---|
| `ROTATION_GRACE_SEC` | **30** | **Sin reserva** (RULE-17): sin ella el API aborta nombrándola |

`JWT_REFRESH_EXPIRY` **no se toca**: rotar y acortar la vida del token son decisiones independientes.

## Contrato con el navegador

Ninguno visible. Las mismas cookies, `httpOnly` igual. Lo único que cambia es que `refresh_token` **se
reescribe en cada refresco** en vez de quedarse fija.

## Reglas de negocio

**Una nueva, y merece número propio**: *reusar un refresh token ya rotado revoca la sesión completa*.
Queda pendiente de asignar `RN-XX` al actualizar `docs-v2` — con la nota de que **el usuario legítimo
también pierde la sesión**, porque no se sabe cuál de las dos copias es la suya.

## Deuda

Ninguna nueva. La limitación de recordar **un** token hacia atrás queda **declarada en `design.md`**
con su motivo y su coste — no es trabajo pendiente, es una decisión tomada.

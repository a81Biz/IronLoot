# PT-194 — spec-changes.md

## Contrato con el navegador

**Ningún cambio observable en el camino feliz.** Las mismas cookies, los mismos nombres, el mismo
`httpOnly`. El `refresh_token` **sigue sin ser legible desde JS**.

**Lo que cambia**, y es lo que el usuario nota:

| Antes | Después |
|---|---|
| A los **15 minutos** el portal manda al login | La sesión dura hasta que caduca el refresh token (**7 días**) o se revoca |
| Un `fetch` con el token expirado devuelve **401** | Devuelve **200** tras un reintento transparente |

## Contrato con el API

**Ninguno.** No se añade, quita ni modifica un solo endpoint. `POST /api/v1/auth/refresh` ya existe y
se usa tal cual. **El inventario de rutas no cambia** — sigue en 157.

## Reglas de negocio

**Ninguna nueva.** `RN-02` (vida de sesión) deja de estar contradicha por la implementación: lo que
declara empieza a cumplirse.

> **Nota para quien actualice `docs-v2`**: hoy la documentación no dice en ninguna parte que la sesión
> efectiva sean quince minutos, porque nadie lo había medido — se descubrió en PT-192. No hay que
> corregir una afirmación falsa; hay que **añadir** la verdadera, con los cuatro relojes juntos
> (`AUD-035`).

## Configuración

**Ninguna variable nueva.** Se usan las que ya hay:

| Variable | Uso nuevo |
|---|---|
| `JWT_ACCESS_EXPIRY` | Ya define el token; ahora también el `maxAge` de la cookie en CLIENT (ya lo hacía en BASE desde PT-192) |
| `JWT_REFRESH_EXPIRY` | Sin cambio: define hasta cuándo se puede refrescar |
| `API_URL` | Sin cambio; el CLIENT ya lo usa y es obligatoria (PT-186) |

## Deuda

- **`TD-025` se cierra.**
- **No se abre ninguna nueva.** Las dos limitaciones —deduplicación por proceso y `vida-de-sesion.ts`
  duplicado— quedan **declaradas en `design.md` con su motivo y su criterio de revisión**, que es lo
  que las distingue de una deuda: no son trabajo pendiente, son una decisión tomada.

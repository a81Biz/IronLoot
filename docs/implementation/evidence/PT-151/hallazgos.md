# PT-151 — Barrido del patrón de H-019

**INVESTIGATION.** Informa; no corrige. Si hubiera aparecido un caso real, habría abierto PT propio.

## La pregunta, planteada bien

H-019 se suele resumir como «el bug de `deepMerge`». No lo es, y planteándolo así el barrido no
encuentra nada. El defecto es la **combinación**:

1. `ValidationPipe` con `transform: true` hace que al servicio no le llegue un objeto plano sino una
   **instancia con todas las propiedades declaradas**, las ausentes como `undefined`.
2. Un merge escrito a mano que recorra `Object.keys()` **no distingue «ausente» de «presente como
   `undefined`»**, y escribe el `undefined` encima.

Resultado en H-019: un `PATCH {language}` se llevaba por delante las preferencias de notificación, en
silencio y con 200.

Por eso el barrido correcto **no busca una función**: busca *cualquier escritura a una columna `Json`
a partir de un DTO*. Se parte del esquema.

## Lo que se miró

**11 columnas `Json` en `schema.prisma`**: `settings`, `images`, `metadata`, `responseSnapshot`,
`redactedFields`, `payload`, `data`, `details`, `docsJson`, `channelsJson`, y el `payload` de auditoría.

Se rastreó quién escribe cada una y **cómo**:

| Campo | Quién escribe | Forma | Riesgo |
|---|---|---|---|
| `settings` | `users.service.ts:493` | `deepMerge` **a mano** | **Era H-019.** Corregido |
| `images` | `auctions.service.ts:76` (create) · `:203` (update, `...dto`) | Prisma | No |
| `docsJson` | `kyc.service.ts:78` | Prisma `create` | No |
| `channelsJson` | `admin.service.ts:745` | Prisma `create` | No |
| `metadata`, `payload`, `details`, `responseSnapshot`, `redactedFields` | ciclo de pago, traza, auditoría | Prisma, escritura completa | No |

**`Object.assign`: cero ocurrencias** en servicios. **`deepMerge`: una**, la corregida.

## La conclusión, que es estructural y no un simple «no hay más»

**Lo que protege al resto es que Prisma ignora `undefined` en `data:` por contrato.** Por eso
`auctions.update` puede hacer `data: { ...dto }` con toda seguridad: un `PATCH {title}` deja
`dto.images === undefined`, Prisma no toca la columna, y las imágenes sobreviven.

El mismo spread **a mano** sobre un objeto leído habría borrado las imágenes.

> **La exposición no es «tener columnas Json». Es escribir un merge a mano en vez de dejárselo a
> Prisma.** Sólo existía uno, y era H-019.

## Recomendación, no implementación

Una guarda que acusara *cualquier* merge escrito a mano sobre un valor leído sería útil el día que
alguien escriba el segundo. Hoy **no tendría sujeto**: se escribiría un mecanismo sin nada que vigilar
y con riesgo de falsos positivos sobre spreads legítimos.

Se registra la recomendación y se cierra la investigación. Escribir la guarda cuando aparezca el
segundo caso es la decisión correcta; escribirla ahora sería ceremonia.

**Y queda dicho lo que sí conviene recordar**, porque es lo que evita el tercero: *si escribes un
merge a mano sobre un valor de base de datos, descarta los `undefined` explícitamente — nunca los
falsy, que `false` tiene que poder aplicarse*. Ya está en `CLAUDE.md` desde H-019.

## Estado

`CLOSED` — investigación completada, sin hallazgos nuevos. **Que no encontrara nada es un resultado,
no un no-resultado**: ahora se sabe por qué el patrón no se repite.

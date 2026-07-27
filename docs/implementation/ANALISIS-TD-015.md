# Análisis a fondo — TD-015: los 12 avisos que quedan

**Fecha**: 2026-07-27 · **Origen**: PTSA H-008 → PT-110 → PT-116 → PT-119
**Estado del registro**: 26 avisos, **12 paquetes** con advertencia propia.
**Acotado desde PT-118**: el checkpoint del CI falla si aparece el número 13.

> **Qué es este documento.** No es un PT: es el análisis que pediste antes de decidir. Ningún
> paquete se toca aquí. Lo que sigue es **alcanzabilidad medida**, no severidad copiada del aviso.

---

## Resumen: sólo 3 de los 12 están en el camino de ejecución de producción

| | Paquetes | Veredicto |
|---|--:|---|
| **No llegan a producción** | 6 | Instalación, o módulo apagado en producción |
| **En el árbol pero sin uso alcanzable** | 3 | La función vulnerable no se invoca |
| **En el camino, con mitigación** | 3 | Alcanzables, pero acotados por otra capa |
| **Sin mitigación** | **0** | — |

---

## 1. Los que NO llegan a producción (6)

### `tar` — CRÍTICA · `bcrypt` → `@mapbox/node-pre-gyp`

*Arbitrary File Creation/Overwrite via Hardlink Path Traversal.*

`node-pre-gyp` descarga y descomprime binarios **al instalar**. No se ejecuta en el servidor. Para
explotarlo habría que comprometer el registro de npm o el CDN de bcrypt — y en ese escenario el
`tar` es el menor de los problemas.

**Exige** `bcrypt@6` (mayor). **Riesgo en ejecución: ninguno.**

### `js-yaml` — ALTA · `@nestjs/swagger`

*Prototype pollution in merge (`<<`).*

Swagger **no se monta en producción**. `main.ts:92`:

```ts
// Swagger (non-production only)
if (env !== 'production') {
```

**Exige** `@nestjs/swagger@11` (mayor). **Riesgo en producción: ninguno.**

### `linkify-it`, `brace-expansion`, `glob`, `minimatch` — ALTA · `@nestjs-modules/mailer`

Los cuatro cuelgan del mailer, y ninguno participa en enviar un correo:

| Paquete | Aviso | Por qué no aplica |
|---|---|---|
| `linkify-it` | Complejidad cuadrática en el escaneo | Detecta enlaces en Markdown. Las plantillas son **dos `.hbs` del proyecto**, no entrada de usuario |
| `brace-expansion` | Cuelgue por secuencia de paso cero | Expansión de patrones de fichero. Los patrones son del código |
| `glob` | **Inyección de comandos vía CLI `-c/--cmd`** | Es la **CLI** de glob. El proyecto usa la biblioteca, no el ejecutable |
| `minimatch` | ReDoS con comodines repetidos | Idem: patrones del código, no del usuario |

Los cuatro exigen saltos mayores de utilidades transitivas. **Riesgo: ninguno alcanzable.**

---

## 2. En el árbol, sin uso alcanzable (3)

### `uuid` — MODERADA

*Missing buffer bounds check in **v3/v5/v6** when `buf` is provided.*

Se buscó en todo el código: **no hay una sola llamada a v3, v5 ni v6**, ni con `buf` ni sin él. El
proyecto usa v4.

**Exige** `uuid@14` (mayor). **Riesgo: ninguno — la función vulnerable no se invoca.**

### `file-type` — MODERADA · `@nestjs/common`

*Bucle infinito en el parser ASF con entrada malformada.*

ASF es un contenedor de audio/vídeo de Microsoft. La subida sólo acepta imágenes, y el parser ASF no
se alcanza desde ninguna ruta.

**Riesgo: ninguno con la superficie actual.** ⚠️ Si algún día se aceptara vídeo, **este aviso pasa a
ser alcanzable**. Queda anotado.

### `path-to-regexp` — ALTA · `@nestjs/serve-static`

*Expresiones regulares con retroceso (ReDoS).*

`ServeStaticModule` sirve `/uploads` desde disco. La ruta es fija y no se compila un patrón por
petición.

**Exige** `@nestjs/serve-static@5` (mayor, y arrastra Express 5). **Riesgo: bajo.**

---

## 3. En el camino de ejecución, con mitigación (3)

### `multer` — ALTA · **el más alcanzable de los doce**

*Denial of Service via incomplete cleanup.*

`upload.controller.ts:49` usa `FileInterceptor('file')`. **Es superficie real.**

Mitigación existente:
- `@UseGuards(JwtAuthGuard)` — **exige sesión**. No es anónimo, a diferencia del vector de
  `engine.io` que PT-110 cerró.
- Rate limiting global de `@nestjs/throttler`.

⚠️ **Lo que no encontré**: un límite de tamaño de fichero. `grep` por `limits`, `fileSize` y
`maxSize` en el módulo de subida no devuelve nada. Eso **no es esta CVE**, pero es de la misma
familia y es más barato de arreglar que subir Express.

**Exige** `@nestjs/platform-express@11` (mayor).

### `@nestjs/core` — MODERADA

*Improperly Neutralizes Special Elements in Output Used by a Downstream Component.*

Es el framework. Está en todo el camino por definición.

**Exige** `@nestjs/core@11` — **la migración grande**.

### `body-parser` — BAJA

*DoS cuando un `limit` inválido se ignora en silencio.*

Requiere que alguien configure un `limit` mal escrito. La configuración es del proyecto, no del
usuario. **Exige** Express 5.

---

## 4. Qué haría falta para cerrarlos

Los 12 se reducen a **tres decisiones de plataforma**:

| Decisión | Cierra | Riesgo del cambio |
|---|--:|---|
| **NestJS 10 → 11** (arrastra `@nestjs/swagger`, `platform-express`, `serve-static` → Express 5) | **7** | **Alto.** Express 4→5 cambia el enrutado (`path-to-regexp` 3→8), el manejo de errores async y middleware. Es *la* migración |
| **`bcrypt` 5 → 6** | 1 | **Bajo.** Superficie: hash y compare. Cubierto por los tests de auth |
| **`uuid` 13 → 14** | 1 | **Bajo.** Sólo se usa v4 |
| Utilidades transitivas del mailer (4) | 3 | Se resuelven solas al subir el mailer, o con overrides |

---

## 5. Recomendación

**No hacer la migración a NestJS 11 ahora.** Y el motivo no es pereza:

- **Ninguno de los 12 es alcanzable sin autenticar.** El que sí lo era —`engine.io`— lo cerró
  PT-110.
- El único con superficie real es `multer`, y está detrás de `JwtAuthGuard`.
- Express 4→5 cambia enrutado y manejo de errores en un servidor que **mueve dinero real**. Esta
  sesión ha demostrado dos veces que un cambio «obvio» rompe algo en silencio (F-34, F-38).

**Lo que sí haría, y es barato:**

1. **`bcrypt` 5→6 y `uuid` 13→14** por separado. Cierran 2 de 12 con superficie mínima y tests que
   los cubren. Cada uno su PT, cada uno su verificación.
2. **Poner un límite de tamaño al `FileInterceptor`.** No cierra la CVE de `multer`, pero cubre la
   misma clase de riesgo y cuesta una línea. Es lo que más reduce exposición real por unidad de
   riesgo.
3. **Dejar NestJS 11 como decisión consciente**, con fecha de revisión. No como deuda olvidada:
   está acotada por el checkpoint de PT-118 y revisada en `security-baseline.json` antes del
   2026-10-27.

## 6. Lo que este análisis NO demuestra

**No se intentó explotar ninguna.** Lo verificado es: el aviso publicado, la cadena de dependencias
resuelta con `npm ls`, y el punto de uso localizado en el código —o su ausencia—.

Que un paquete vulnerable no aparezca alcanzable **no demuestra que sea inexplotable**: puede haber
una ruta que no vi. Afirmar lo contrario sería opinión, y `[A1]` la prohíbe.

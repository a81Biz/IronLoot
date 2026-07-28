# PT-129 — Design: una imagen de producción que arranca y se ve sana

**Tipo**: BUG · **Complejidad**: STANDARD · **Origen**: PTSA **H-017** (ALTA, D2) · Evidencia **E-021**
**Fuentes**: `DISCOVERY.md` § PT-129 · `CONTEXT_ANALYSIS.md` § PT-129 · `PLAN_ACTUAL.md` ·
los seis `Dockerfile*` · `docker-compose.yml` · `src/api/src/main.ts` · `ci.yml`.
**Dependencia**: **PT-128** para la verificación en el pipeline. **PT-127** para que la imagen tenga
esquema contra el que arrancar.

---

## El problema en una frase

La única imagen de producción que existe pide su healthcheck a una ruta que devuelve 404, tres de
los cuatro servicios no tienen imagen, y el job que las construiría apunta a un fichero que no
existe.

## Tres defectos, una causa

Ninguno de los tres es sutil. Los tres han sobrevivido por la misma razón: **nadie ha construido ni
arrancado nunca una imagen de producción.** Un healthcheck que nadie ha visto pasar no es un
healthcheck; es una línea de texto.

---

## Decisiones

### D1 — La ruta y el criterio se toman del que ya funciona

`src/api/Dockerfile:60-61` hoy:

```dockerfile
CMD node -e "require('http').get('http://localhost:3000/health', \
    (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
```

`docker-compose` define el que sí corre, y está bien:

```
CMD node -e "require('http').get('http://localhost:3000/api/v1/health',
    (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"
```

Se adopta el segundo. **Las tres diferencias importan:**

| | Imagen (hoy) | Compose (correcto) | Por qué |
|---|---|---|---|
| Ruta | `/health` → 404 | `/api/v1/health` | `main.ts:77` fija `setGlobalPrefix('api')` + versionado |
| Umbral | `=== 200` | `< 500` | Un 503 por dependencia degradada **no** es un contenedor muerto. Con `=== 200` un Redis caído tira el contenedor entero |
| Error de conexión | sin manejar → excepción no capturada | `.on('error', …)` | Sin él, el proceso del healthcheck muere de otra forma y el diagnóstico es peor |

El umbral es la decisión con contenido. `< 500` distingue **degradado** de **muerto**, y esa
distinción es justo la que `/health/detailed` existe para reportar.

### D2 — Una sola definición del healthcheck

Hoy hay dos y han divergido. Después: la definición vive en el `Dockerfile`, y `docker-compose`
**hereda** en vez de redefinir. Si en el futuro hace falta un criterio distinto en desarrollo, se
sobrescribe a propósito y con comentario — no por descuido.

### D3 — Tres imágenes de producción nuevas, copiando el patrón que existe

ADMIN, BASE y CLIENT sólo tienen `Dockerfile.dev`. Se escriben tres de producción siguiendo el del
API: multi-stage, `npm prune --production`, usuario no-root `1001`, `NODE_ENV=production`,
healthcheck correcto.

**Dos problemas específicos de los SSR, que el del API no tiene:**

1. **`views/` y `public/` deben entrar en la imagen.** `npm run build` compila TypeScript a `dist/`
   y **no toca las plantillas Nunjucks ni los estáticos**. Una imagen que copie sólo `dist/`
   arranca, pasa el healthcheck y devuelve 500 en cuanto alguien pide una página. Por eso la
   verificación exige **pedir una página real**, no sólo el healthcheck.

2. **`@ironloot/core` es paquete del workspace.** En desarrollo lo enlaza `entrypoint.dev.sh:29-41`
   a mano, con un `ln -sfn`. **En producción no hay equivalente**: el build debe compilar
   `src/packages/core` y resolverlo, o el contenedor no arranca.

El segundo es el riesgo real de este PT y no aparecía en el hallazgo. Se descubrió leyendo el
entrypoint en STATE 1.

### D4 — El contexto de build

PT-126 acotó el contexto de Docker (`6d1b4ef`). Cualquier `Dockerfile` nuevo debe respetar ese
acotamiento y no volver a meter el monorepo entero en el contexto. Pero `@ironloot/core` vive
**fuera** del contexto de cada servicio, así que hay dos vías:

- **a)** Contexto en la raíz del monorepo con `.dockerignore` estricto.
- **b)** Publicar/empaquetar `@ironloot/core` como artefacto y consumirlo.

**Se propone (a)** por ser lo que ya hace el `docker-compose` de desarrollo con sus volúmenes, y por
no introducir un registro de paquetes que hoy no existe. **Se señala como decisión secundaria del
Gate**: (b) es más limpio a largo plazo y más caro ahora.

### D5 — El job `docker` construye lo que existe, y arranca lo que construye

`ci.yml:205` apunta a `file: ./Dockerfile`, inexistente. Se corrige a los cuatro servicios reales.

Y se añade lo que cierra la causa raíz: **arrancar cada imagen y comprobar que llega a `healthy`**,
más una petición a una página real en los SSR. Sin este paso, el hallazgo vuelve — porque lo que
falló no fue escribir mal una línea, fue no comprobarla nunca.

---

## Alternativas descartadas

**Sólo arreglar el healthcheck del API.** Cierra un tercio del hallazgo y deja tres servicios sin
artefacto y un job apuntando al vacío. Cerraría H-017 en el papel.

**Copiar el criterio `=== 200` a los demás.** Propaga el defecto. Un 503 por dependencia degradada
tiraría los cuatro contenedores.

**Un `Dockerfile` genérico parametrizado para los cuatro servicios.** Suena elegante y esconde las
diferencias reales (los SSR necesitan `views/` y `public/`; el API no). Cuatro ficheros explícitos
se leen mejor que uno con condicionales.

**Dejar el healthcheck fuera de la imagen y sólo en el orquestador.** Es defendible en Kubernetes,
pero aquí no hay orquestador decidido, y una imagen que no sabe decir si está sana es peor que una
que sí.

---

## Componentes tocados

| Fichero | Cambio |
|---|---|
| `src/api/Dockerfile` | Healthcheck: ruta, umbral y manejador de error |
| `src/admin/Dockerfile` | **nuevo** |
| `src/apps/base/Dockerfile` | **nuevo** |
| `src/apps/client/Dockerfile` | **nuevo** |
| `docker-compose.yml` | Hereda el healthcheck en vez de redefinirlo (D2) |
| `.github/workflows/ci.yml` | Job `docker`: rutas reales + arranque y comprobación |
| `.dockerignore` | Sólo si D4 opta por contexto en la raíz |

## Lo que no cambia de comportamiento

**El entorno de desarrollo diario.** `docker-compose up -d` debe seguir dejando los cuatro servicios
`healthy` exactamente como hoy. Es la primera comprobación de regresión.

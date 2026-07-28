# PT-135 — Tareas atómicas

**Prerequisito**: ninguno sobre otro PT. Docker operativo.
Ninguna empieza antes del ACK del Proposal Gate.
**Prohibido en todas**: ejecutar `npm` en el host. Toda invocación va por `docker compose run`.

---

## PT-135.1 — G1 en RED: la guarda del contenido del lock

- **Objetivo**: una prueba que falle **hoy**, con el lock roto que está en `master`.
- **Entrada**: `src/api/package-lock.json`; patrón de `coherencia-documentacion-codigo.spec.ts`.
- **Salida**: `src/api/test/unit/infraestructura/lock-declara-plataformas.spec.ts`. Lee el lock **como
  JSON**; para cada paquete con `optionalDependencies` divididas por plataforma, exige entradas de
  `linux-x64-gnu` y `linux-x64-musl` en el árbol instalado. **Presencia de claves, nunca versiones.**
- **Validación**: **falla** contra el lock actual, nombrando los paquetes que faltan.
- **Status**: PENDING

## PT-135.2 — El lock del API, regenerado en su contenedor

- **Objetivo**: que el lock declare las plataformas que construimos (D2).
- **Entrada**: D1. Primero **medir** qué escribe `--package-lock-only` sobre Linux: ¿el árbol completo
  o sólo su plataforma? Registrar la respuesta antes de aceptar el mecanismo.
- **Salida**: `src/api/package-lock.json` regenerado. Diff revisado **entrada por entrada**; lo que se
  mueva y no sea plataforma, justificado o corregido aquí.
- **Validación**: **G1 pasa a verde** · la entrada de `@ironloot/core` (`file:../packages/core`) intacta.
- **Status**: PENDING

## PT-135.3 — Arrancar de verdad: volumen limpio, sin caché

- **Objetivo**: ver el entorno vivo. **Aquí deja de estar caído.**
- **Entrada**: `docker compose down -v` → `build --no-cache api` → `up -d`.
- **Salida**: los **ocho** contenedores `healthy`, capturado.
- **Validación**: `ls node_modules/@css-inline` en la imagen nueva → ≥2 directorios · **un correo real
  visto en Mailhog** (`:8026`) — el binario puede cargar y el adaptador de Handlebars no rendir el
  HTML, y el arranque no lo delataría · `msgpackr` con prebuild y **sin** `build/Release/extract.node`.
- **Status**: PENDING

## PT-135.4 — G2: la guarda que impide instalar fuera del contenedor

- **Objetivo**: convertir I1 de instrucción en mecanismo. **Es la corrección real del PT.**
- **Orden**: prueba **primero** (RED), script después.
- **Salida**: `scripts/solo-en-contenedor.js` + `preinstall` en los `package.json` de raíz, `src/api`
  y `src/admin`. Mensaje que **dice qué ejecutar en su lugar**. Sin puerta de escape por variable de
  entorno (D4).
- **Validación**: **caso de control** — plataforma forzada a `win32` → aborta; a `linux` → pasa ·
  `prepare: husky install` (`src/api/package.json:25`) sigue funcionando · **los siete jobs de CI
  instalan igual**.
- **Medir, no suponer**: si conviene exigir además `/.dockerenv`. Si bloquea CI, se queda en la
  comprobación de plataforma **y se registra la medición**.
- **Status**: PENDING

## PT-135.5 — El comando, en vez del recuerdo

- **Objetivo**: que el camino correcto sea el más corto. Un procedimiento que exige memoria ya falló.
- **Salida**: `lock:api`, `lock:admin`, `lock:root` en el `package.json` de la raíz, envolviendo la
  invocación de Docker con `--entrypoint` y `--no-deps`.
- **Validación**: cada uno ejecutado; regenera su lock **sin ejecutar npm en el host**.
- **Status**: PENDING

## PT-135.6 — El inventario completo: `admin` y `.gitignore`

- **Objetivo**: cerrar la alternativa C (D3).
- **Salida**: `src/admin/package-lock.json` regenerado en su contenedor y **seguido por git** ·
  `.gitignore:40` (`package-lock.json`) **retirado**.
- **Validación**: `git ls-files` muestra los tres locks · las 13 unitarias de ADMIN intactas ·
  ADMIN arranca y llega a `healthy`.
- **Status**: PENDING

## PT-135.7 — `npm ci` en las cinco imágenes

- **Objetivo**: que el lock mande donde se construye.
- **Salida**: `npm install` → `npm ci` en `src/api/Dockerfile.dev`, `src/api/Dockerfile`, y los
  `Dockerfile.dev` de `admin`, `base` y `client` — **añadiendo el `COPY` del lock donde hoy sólo se
  copia `package.json`**.
- **Validación**: las cuatro imágenes de desarrollo `healthy` **y** las cuatro de producción
  construidas y arrancadas hasta `healthy` (la aceptación que exigió PT-129).
- **Status**: PENDING

## PT-135.8 — `npm ci` en los siete jobs

- **Objetivo**: cerrar el círculo. **Va al final a propósito** (PT-118: un control que nace rojo muere).
- **Salida**: los siete `run: npm install` de `ci.yml` → `npm ci`.
- **Validación**: **un push real**, y los siete jobs vistos en verde. No inferidos.
- **Puerta de salida escrita**: si aparece un desajuste lock↔`package.json`, se corrige **aquí**. Si
  uno excede el PT, ese punto vuelve a `npm install` **y se dice** en la evidencia.
- **Status**: PENDING

## PT-135.9 — El comentario que miente con aval

- **Salida**: `src/api/Dockerfile:53-62` — el parche **se conserva** (D6), su explicación se corrige:
  la variante **no** estaba en el lock, PT-126 la había borrado el día antes.
- **Validación**: la afirmación nueva es comprobable contra el lock y contra `git show 6d1b4ef`.
- **Status**: PENDING

## PT-135.10 — La segunda escritura

- **Salida**: `CLAUDE.md` § Key Technical Decisions (I1, con el comando y con lo que pasa si se
  ignora) · `11-Conventions.md` `RULE-NN` con ejemplo correcto/incorrecto · **ADR nuevo** en
  `docs-v2/transversal/Registro-Maestro-de-ADR.md` (locks seguidos, generados en contenedor,
  `.gitignore:40` retirado) · `10-Technical-Debt.md` **cerrando** entradas, **sin abrir ninguna**.
- **Validación**: `coherencia-deuda-tecnica.spec.ts` en verde · cada estado nuevo **cita qué leer**.
- **Status**: PENDING

## PT-135.11 — Regresión completa

- **Validación**: **919** unitarias (API 666 · CORE 134 · CLIENT 103 · ADMIN 13 · BASE 3) · **77 e2e**
  · **136 por navegador** · `lint` 0 · `npm audit --omit=dev` = 0 en los cinco · **cero cambios en
  `src/api/src/`**.
- **Nota**: `run-all.sh` **trunca la base**. Copia antes si sostiene una validación PTSA.
- **Status**: PENDING

## PT-135.12 — Evidencia, self-review y registro

- **Salida**: `docs/implementation/evidence/PT-135/` con el antes (el log del `MODULE_NOT_FOUND`) y el
  después, **declarando volumen eliminado y `--no-cache`** · `self-review.md` · `HISTORY.log` ·
  `HANDOFF.md` · las dos guardas **vistas fallar**.
- **Estado final**: **`VALIDATION_PENDING`**. Es un BUG: lo cierra el humano.
- **Status**: PENDING

---

## Commits previstos

```
test: PT-135 la guarda que exige los binarios de Linux en el lock        (.1)
fix:  PT-135 el lock del API regenerado en su contenedor                 (.2)
test: PT-135 la guarda que impide instalar fuera del contenedor          (.4)
feat: PT-135 los comandos de regeneracion del lock                       (.5)
fix:  PT-135 el lock de ADMIN seguido y .gitignore sin la contradiccion   (.6)
refactor: PT-135 las cinco imagenes construyen con npm ci                (.7)
refactor: PT-135 los siete jobs instalan con npm ci                      (.8)
docs: PT-135 el comentario de Dockerfile corregido y la segunda escritura (.9 .10)
docs: PT-135 evidencia, self-review e historia                           (.12)
```

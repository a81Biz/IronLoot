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
- **Status**: DONE

## PT-135.2 — El lock del API, regenerado en su contenedor

- **Objetivo**: que el lock declare las plataformas que construimos (D2).
- **Entrada**: D1. Primero **medir** qué escribe `--package-lock-only` sobre Linux: ¿el árbol completo
  o sólo su plataforma? Registrar la respuesta antes de aceptar el mecanismo.
- **Salida**: `src/api/package-lock.json` regenerado. Diff revisado **entrada por entrada**; lo que se
  mueva y no sea plataforma, justificado o corregido aquí.
- **Validación**: **G1 pasa a verde** · la entrada de `@ironloot/core` (`file:../packages/core`) intacta.
- **Status**: DONE

## PT-135.3 — Arrancar de verdad: volumen limpio, sin caché

- **Objetivo**: ver el entorno vivo. **Aquí deja de estar caído.**
- **Entrada**: `docker compose down -v` → `build --no-cache api` → `up -d`.
- **Salida**: los **ocho** contenedores `healthy`, capturado.
- **Validación**: `ls node_modules/@css-inline` en la imagen nueva → ≥2 directorios · **un correo real
  visto en Mailhog** (`:8026`) — el binario puede cargar y el adaptador de Handlebars no rendir el
  HTML, y el arranque no lo delataría · `msgpackr` con prebuild y **sin** `build/Release/extract.node`.
- **Status**: DONE

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
- **Status**: DONE

## PT-135.5 — El comando, en vez del recuerdo

- **Objetivo**: que el camino correcto sea el más corto. Un procedimiento que exige memoria ya falló.
- **Salida**: `lock:api`, `lock:admin`, `lock:root` en el `package.json` de la raíz, envolviendo la
  invocación de Docker con `--entrypoint` y `--no-deps`.
- **Validación**: cada uno ejecutado; regenera su lock **sin ejecutar npm en el host**.
- **Status**: DONE

## PT-135.6 — El inventario completo: `admin` y `.gitignore`

- **Objetivo**: cerrar la alternativa C (D3).
- **Salida**: `src/admin/package-lock.json` regenerado en su contenedor y **seguido por git** ·
  `.gitignore:40` (`package-lock.json`) **retirado**.
- **Validación**: `git ls-files` muestra los tres locks · las 13 unitarias de ADMIN intactas ·
  ADMIN arranca y llega a `healthy`.
- **Status**: DONE

## PT-135.7 — `npm ci` en las cinco imágenes

- **Objetivo**: que el lock mande donde se construye.
- **Salida**: `npm install` → `npm ci` en `src/api/Dockerfile.dev`, `src/api/Dockerfile`, y los
  `Dockerfile.dev` de `admin`, `base` y `client` — **añadiendo el `COPY` del lock donde hoy sólo se
  copia `package.json`**.
- **Validación**: las cuatro imágenes de desarrollo `healthy` **y** las cuatro de producción
  construidas y arrancadas hasta `healthy` (la aceptación que exigió PT-129).
- **Status**: DONE

## PT-135.8 — `npm ci` en los siete jobs

- **Objetivo**: cerrar el círculo. **Va al final a propósito** (PT-118: un control que nace rojo muere).
- **Salida**: los siete `run: npm install` de `ci.yml` → `npm ci`.
- **Validación**: **un push real**, y los siete jobs vistos en verde. No inferidos.
- **Puerta de salida escrita**: si aparece un desajuste lock↔`package.json`, se corrige **aquí**. Si
  uno excede el PT, ese punto vuelve a `npm install` **y se dice** en la evidencia.
- **Status**: DONE en el código · **VALIDACIÓN PENDIENTE**: el push real no lo puedo hacer yo. Se
  ensayó en contenedor (`npm ci` en la raíz, exit 0, con el `postinstall` instalando api y admin), lo
  cual **no sustituye** a ver los siete jobs. Es el criterio 10, y es lo único que falta.
- **Añadido sobre el plan**: el `postinstall` de la raíz también pasa a `npm ci` — es por donde CI
  instala `api` y `admin`, justo los dos locks que este PT arregla.

## PT-135.9 — El comentario que miente con aval

- **Salida**: `src/api/Dockerfile:53-62` — el parche **se conserva** (D6), su explicación se corrige:
  la variante **no** estaba en el lock, PT-126 la había borrado el día antes.
- **Validación**: la afirmación nueva es comprobable contra el lock y contra `git show 6d1b4ef`.
- **Status**: DONE

## PT-135.10 — La segunda escritura

- **Salida**: `CLAUDE.md` § Key Technical Decisions (I1, con el comando y con lo que pasa si se
  ignora) · `11-Conventions.md` `RULE-NN` con ejemplo correcto/incorrecto · **ADR nuevo** en
  `docs-v2/transversal/Registro-Maestro-de-ADR.md` (locks seguidos, generados en contenedor,
  `.gitignore:40` retirado) · `10-Technical-Debt.md` **cerrando** entradas, **sin abrir ninguna**.
- **Validación**: `coherencia-deuda-tecnica.spec.ts` en verde · cada estado nuevo **cita qué leer**.
- **Status**: DONE

## PT-135.11 — Regresión completa

- **Validación**: **919** unitarias (API 666 · CORE 134 · CLIENT 103 · ADMIN 13 · BASE 3) · **77 e2e**
  · **136 por navegador** · `lint` 0 · `npm audit --omit=dev` = 0 en los cinco · **cero cambios en
  `src/api/src/`**.
- **Nota**: `run-all.sh` **trunca la base**. Copia antes si sostiene una validación PTSA.
- **Status**: DONE

## PT-135.12 — Evidencia, self-review y registro

- **Salida**: `docs/implementation/evidence/PT-135/` con el antes (el log del `MODULE_NOT_FOUND`) y el
  después, **declarando volumen eliminado y `--no-cache`** · `self-review.md` · `HISTORY.log` ·
  `HANDOFF.md` · las dos guardas **vistas fallar**.
- **Estado final**: **`VALIDATION_PENDING`**. Es un BUG: lo cierra el humano.
- **Status**: DONE

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

Reparto real, 11 commits (dos más de los previstos, y uno de ellos no estaba en el plan):

```
docs:     PT-135 discovery, contexto, plan y paquete de propuesta
test:     PT-135 la guarda que exige los binarios de Linux en el lock          (.1)
fix:      PT-135 el lock del API regenerado en su contenedor                   (.2)
test:     PT-135 la guarda que impide instalar fuera del contenedor           (.4)
feat:     PT-135 npm no se ejecuta en el host, y el camino correcto es mas corto (.4 .5)
fix:      PT-135 el inventario de locks, completo y sin contradiccion          (.6)
refactor: PT-135 el lock manda donde se construye y donde se verifica         (.7 .8)
docs:     PT-135 el comentario de Dockerfile que mentia con aval              (.9)
fix:      PT-135 la regresion de seguridad que trajo regenerar el lock         (nuevo)
docs:     PT-135 la segunda escritura, y las citas del TRD que volvieron a mentir (.10)
docs:     PT-135 evidencia, self-review e historia                            (.12)
```

Dos uniones y una separación, cada una con motivo:

- **.4 y .5 en un commit**: el mensaje de la guarda apunta a `npm run lock:api`. Separarlos habría
  dejado un mensaje mandando a un comando inexistente.
- **.7 y .8 en un commit**: es un solo cambio lógico —que el lock gobierne— en imágenes y en CI.
- **.9 aparte de .7** aunque toquen el mismo fichero: uno cambia `npm install` por `npm ci`, el otro
  corrige una explicación falsa. Son dos cosas, y por eso el comentario se revirtió temporalmente para
  commitear `npm ci` limpio y se volvió a aplicar después.

---

## Cierre — desviaciones respecto al plan

Las doce tareas hechas. Lo que no salió como estaba escrito, con su motivo:

| # | Desviación | Motivo |
|---|---|---|
| 1 | **El mecanismo de la tarea .2 no funcionaba tal como se planeó** | `--package-lock-only` responde «up to date» y no toca nada. Y regenerar desde cero tampoco basta si el `node_modules` del host está visible: npm deriva el árbol del **real**, y el del host es de Windows. Hay que enmascararlo. Y `--ignore-scripts`, o husky sin git sale con 127 dejando el lock a medio escribir |
| 2 | **`docker compose down -v` NO se ejecutó** | Habría borrado `ironloot_postgres_data`: la base de datos. Se usó `docker compose rm -fsv api`, que sólo toca el volumen anónimo. **Error del plan**, corregido antes de ejecutar |
| 3 | **La exigencia de conservar `win32` se cae** | Con la invariante en vigor, si nadie instala en Windows el lock no necesita su binario. La guarda exige las dos plataformas que construimos. En la práctica la regeneración conserva las 17 |
| 4 | **BASE y CLIENT se quedan en `npm install`** | Son workspaces: su lock es el de la raíz y está fuera de su contexto de build (acotado por PT-126). `npm ci` exigiría deshacer esa decisión, y la ganancia no existe (cero paquetes por plataforma en ese lock). **Declarado en los dos `Dockerfile`** |
| 5 | **Un cuarto lock**, no previsto | Retirar `.gitignore:40` destapó `tests/qa-browser-suite/package-lock.json`. Excepción declarada y vigilada |
| 6 | **`.gitignore` tuvo que tocarse dos veces** | La primera por `*.js` en la línea 67, que ignoraba el utillaje de la raíz: el mismo defecto que PT-088 documentó con el JS de navegador. Sin la excepción, la guarda que impide instalar en el host se habría quedado en la máquina de quien la escribió |
| 7 | **La guarda documental de PT-130 se extiende a la prosa** | No estaba en el plan. Añadir una línea a `package.json` desplazó sus cinco citas y la guarda las cazó; al corregirlas aparecieron **tres citas de prosa rotas desde antes** |
| 8 | **Una regresión de seguridad propia** | Regenerar el lock trajo 2 avisos altos donde había 0. Corregida aquí, como manda `audit:check` |
| 9 | **Las 136 comprobaciones por navegador son 176** | La suite creció desde PT-134. 176/176, con la fase de PayPal declarada aparte: falla en UI externa y no se cuenta como pasada |
| 10 | **La regresión no se puede correr donde el plan suponía** | Los e2e no van en el host (`db`/`redis` son nombres de la red) ni dentro de `ironloot-api` (exit 137, límite de 1 GB). Van en un contenedor desechable **con la imagen del API** — con `node:20-slim` pelado, Prisma pide el motor de OpenSSL 1.1. Es F-135-B |

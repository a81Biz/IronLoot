# PT-135 — Cambios de especificación

Lo que deja de ser verdad, y lo que pasa a serlo. **Ninguna entrada nueva de deuda**: la corrección 2
del ACK no lo permite.

---

## `.gitignore`

| | |
|---|---|
| **Antes** | Línea 40: `package-lock.json` — ignora los tres locks del repositorio |
| **Después** | **Retirada.** Los locks se siguen por git |
| **Por qué** | La regla decía lo contrario de lo que el repositorio hacía: dos locks seguidos contra ella y uno no seguido. Una regla así es una trampa para quien la lea y la respete |

## `CLAUDE.md` § Key Technical Decisions

Entrada nueva, en el tono de las demás:

> **npm no se ejecuta en el host: se ejecuta en el contenedor.** `npm install` en Windows regenera
> `package-lock.json` con el árbol de *esa* plataforma y **se lleva los binarios nativos de Linux**.
> El contenedor entonces instala menos de lo que necesita y **no falla al instalar: falla al
> arrancar**, en otra máquina, días después — con el volumen anónimo de `node_modules` tapándolo
> mientras no se recree. Es lo que pasó entre PT-126 y PT-135. Para regenerar un lock:
> `npm run lock:api` (envuelve `docker compose run --entrypoint`). Lo impide `preinstall`
> (`scripts/solo-en-contenedor.js`) y lo vigila `lock-declara-plataformas.spec.ts`.

## `docs/enterprise-documentation/11-Conventions.md`

`RULE-NN` nueva, con ejemplo correcto/incorrecto, sobre generar locks fuera del contenedor.

## `docs-v2/transversal/Registro-Maestro-de-ADR.md`

**ADR nuevo** — la decisión que no existía en ningún sitio:

- Los tres locks (raíz, `src/api`, `src/admin`) **se siguen por git**: son el contrato de
  reproducibilidad.
- **Se generan sólo dentro de sus contenedores.**
- `.gitignore:40` retirado; la contradicción se elimina en vez de declararse como excepción.
- Alternativa rechazada: dejar de seguirlos. Renuncia a la reproducibilidad y rompe el caché de los
  siete jobs (`cache: 'npm'` resuelve el lock de la raíz).
- Se cita `5c16af4` como el commit sucio que metió el lock del API sin decisión — **la historia no se
  reescribe**; queda como el ejemplo de por qué existe la regla de commits atómicos.

## `docs/enterprise-documentation/10-Technical-Debt.md`

**Sólo cierres.** Cada estado nuevo cita qué leer:

| Entrada | Cierre |
|---|---|
| Locks fuera de git / sin política | ADR nuevo + `.gitignore` sin la línea + los tres seguidos |
| ADMIN sin lock compartido | `src/admin/package-lock.json` seguido |
| `npm install` en CI en vez de `npm ci` | Los siete jobs, con `npm ci` |

## `src/api/Dockerfile` — comentario, líneas 53-62

| | |
|---|---|
| **Antes** | «La variante existe en `package-lock.json`, pero npm sobre alpine no la resuelve sola» |
| **Después** | La variante **no** estaba en el lock: PT-126 la borró el día anterior (`git show 6d1b4ef`). El parche se conserva como cinturón sobre una causa que ya reincidió dos veces |

## `package.json` — raíz, `src/api`, `src/admin`

- `preinstall`: `node scripts/solo-en-contenedor.js` (G2).
- Raíz: scripts `lock:api`, `lock:admin`, `lock:root`.

## `.github/workflows/ci.yml`

Los siete `run: npm install` → `npm ci` (líneas 31, 65, 115, 142, 198, 258, 282).

## Los cinco Dockerfile

`npm install` → `npm ci`, **y `COPY` del lock** donde hoy sólo se copia `package.json`
(`src/apps/base/Dockerfile.dev:6`, `src/apps/client/Dockerfile.dev:6`, `src/admin/Dockerfile.dev:3`).

## Lo que NO cambia

- `docker-compose.yml` — el entorno de todos los días.
- `src/api/src/` y el resto del producto — ni un fichero.
- `prisma/schema.prisma` y las migraciones — **la migración se aplica bien hoy**; no es la causa,
  aunque el log invite a mirarla.
- El healthcheck — PT-129 ya lo corrigió; falla porque no hay nadie escuchando.

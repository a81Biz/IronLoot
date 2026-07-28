# PLAN_ACTUAL — STATE 2: Clasificación y Estrategia

**Fecha**: 2026-07-28 · **Revisión 2** (rehecha tras el ACK humano)
**Origen**: reporte humano — «el contenedor de api no levanta». Sin hallazgo PTSA propio todavía.
**PT en el plan**: PT-135
**Estado**: **CERRADO** — implementado y fusionado en `master` (443f757, 2026-07-28). Las doce tareas
hechas; PT-135 queda `VALIDATION_PENDING` porque es un BUG y lo cierra el humano.

> **Las cifras de abajo son las del momento de planificar, y se conservan a propósito** (919 unitarias
> / 136 por navegador). Hoy son **944** y **176**: el inventario vivo está en
> `docs-v2/5-qa/Master-Test-Plan.md`, y lo que realmente se midió en
> `docs/implementation/evidence/PT-135/regresion.txt`.
>
> **Diez desviaciones respecto a este plan**, con su motivo, en
> `changes/PT-135-locks-en-contenedor/tasks.md` § Cierre. Dos merecen leerse aquí porque el plan
> estaba **equivocado**, no incompleto: el mecanismo de regeneración del lock que propone no funciona
> tal como está escrito, y `docker compose down -v` **habría borrado la base de datos**.

> El plan anterior (PT-127…PT-130) está cerrado en `HISTORY.log`. `PLAN_ACTUAL.md` es sobrescribible:
> sólo puede haber un plan activo.

---

## Las dos correcciones del ACK, y lo que cambian

| # | Corrección vinculante | Qué cambia |
|---|---|---|
| **1** | **No debe existir ningún `npm install` en la máquina local.** Se desarrolla en Docker: toda operación de npm va **en el contenedor** | Mata el mecanismo M2 (regenerar en el host). Y **reformula el riesgo principal**: no es que el desarrollador *pueda* romper el lock — es que **ese comando no debería poder ejecutarse allí y hoy nada lo impide** |
| **2** | **No se puede dejar deuda. La alternativa C es obligatorio trabajarla** | PT-135 deja de ser «arreglar un lock» y pasa a **decidir la política de reproducibilidad de dependencias de la plataforma**. Reclasificado a **MAJOR** |

La corrección 1 explica el defecto entero: **el lock de HEAD sólo pudo salir de un `npm install` en
Windows** (PT-126). La invariante ya se violó una vez y nadie se enteró hasta que un contenedor
murió, un día después, en otra máquina. Una invariante sin mecanismo no es una invariante: es una
costumbre.

---

## Lo que las mediciones dejaron cerrado antes de diseñar

**H5 — un solo fichero afectado, confirmado desde dos ángulos.** `base`, `client` y `core` no tienen
lock propio porque son **workspaces** de la raíz (`package.json:5-8`); su árbol vive en el lock de la
raíz, y ahí hay **0 paquetes de plataforma antes y después de PT-126**. Igual `src/admin`: 0.
`src/api` es el único proyecto con dependencias nativas divididas por plataforma, y el único dañado.

**R3 — no hay degradación.** `msgpackr-extract` **carga**: al perder el prebuild cayó a compilar
desde fuente con `node-gyp`, que funciona porque `Dockerfile.dev:8-15` trae `python3`, `make` y `g++`.

**Y apareció el inventario completo, que es el centro de la alternativa C:**

```
package-lock.json                 disco=True  git=True     <- raiz (workspaces)
src/api/package-lock.json         disco=True  git=True     <- el danado
src/admin/package-lock.json       disco=True  git=False     <- existe y nadie lo comparte
.gitignore:40                     package-lock.json         <- los ignora a los tres
```

**No es «el lock del API es la excepción».** Es que la convención declarada y la práctica llevan
meses en desacuerdo: dos locks seguidos contra la regla, uno no seguido, y ninguna decisión
registrada en ADR ni en `HISTORY.log`. `src/admin` es el caso peor: **su árbol no es reproducible por
nadie más**, porque el fichero que lo fija no sale de la máquina donde nació.

---

## Clasificación

| PT | Origen | Tipo | Complejidad | Justificación |
|---|---|---|---|---|
| **PT-135** | reporte humano | **BUG** | **MAJOR** | Cambia la política de reproducibilidad de dependencias de toda la plataforma: tres locks, `.gitignore`, `npm ci` en CI y en las imágenes, y una guarda que impide instalar fuera del contenedor. Exige análisis de riesgo y de regresión obligatorios y Proposal Package |

Era STANDARD en la revisión 1. Lo mueve a MAJOR la corrección 2: resolver C **es** un cambio de
política, y esa es exactamente la razón por la que la revisión 1 lo quería fuera. Ya no lo está.

---

## Objetivo

1. Que el contenedor del API arranque, desde imagen reconstruida y volumen limpio.
2. Que el lock del API declare el árbol de las tres plataformas que este repositorio usa de verdad.
3. Que **generar un lock fuera del contenedor sea imposible**, no inadvisable.
4. Que la política de locks quede **decidida y declarada**, sin contradicción entre `.gitignore` y la
   práctica, y sin ningún lock que exista en una máquina y en ninguna otra.
5. **Cero deuda diferida al terminar.**

---

## Decisión sobre la alternativa C (obligatoria, y aquí se toma)

**Los tres locks se conservan y se siguen por git. Se retira `.gitignore:40`.**

Razones, en orden de peso:

1. **El lock no es el defecto.** El defecto es *dónde se generó*. Dejar de seguirlo (C2) haría
   desaparecer el síntoma renunciando a la reproducibilidad — en un repositorio que acaba de gastar
   PT-127…PT-130 precisamente en poder reproducir lo que construye. Sería tratar la fiebre quitando
   el termómetro.
2. **C2 rompe el caché de CI.** Los siete `actions/setup-node` usan `cache: 'npm'` sin
   `cache-dependency-path`, y esa acción resuelve el lock de la raíz como clave. Sin lock, los siete
   jobs pierden caché (o fallan). Medido: `ci.yml:28, 62, 112, 139, 195, 255, 279`.
3. **`src/admin` demuestra qué pasa cuando un lock no se sigue**: existe en disco, no viaja, y nadie
   fuera de esta máquina puede reproducir su árbol. C2 extendería esa situación a los tres.

Y la contradicción se elimina de raíz en vez de declararse como excepción: **`.gitignore:40` se
retira**, porque una regla que dice lo contrario de lo que el repositorio hace es peor que no tener
regla — es una trampa para el siguiente que la lea y la respete.

**`src/admin/package-lock.json` se regenera en su contenedor y se empieza a seguir.** Es la mitad del
inventario que faltaba.

---

## Solución propuesta — seis piezas, en este orden

El orden importa y no es cosmético: **las piezas 1 y 2 devuelven el entorno a la vida**; las 3 a 6
son el mecanismo. Y la 6 va al final por la lección de PT-118: un control que nace rojo muere.

### 1. Regenerar el lock del API **dentro del contenedor** — M1, y ya no hay M2

```
docker compose run --rm --no-deps --entrypoint sh api -c "npm install --package-lock-only"
```

`--entrypoint` no es opcional: el servicio `api` declara
`ENTRYPOINT ["./scripts/entrypoint.dev.sh"]`, y sin sustituirlo el comando llegaría como argumento
del entrypoint. Lo mismo para `src/admin`.

Criterio: el lock contiene `css-inline-linux-x64-gnu`, `css-inline-linux-x64-musl`,
`msgpackr-extract-linux-x64` **y conserva las de win32 y darwin**. La simetría es el punto:
regenerar en Linux no puede dejar cojo a quien mire el repositorio desde otro sistema. **Es
exactamente el error de PT-126 con los signos cambiados.**

### 2. Verificar arrancando, con volumen limpio y sin caché

`docker compose down -v` → `build --no-cache api` → `up -d`. El volumen anónimo viejo **tapa** el
defecto, y por tanto taparía igual un arreglo falso. La evidencia declara con qué volumen se hizo.

### 3. El comando de regeneración, como comando y no como recuerdo

Scripts en el `package.json` de la raíz — `lock:api`, `lock:admin`, `lock:root` — que envuelven la
invocación de Docker con sus banderas. Nadie tiene que acordarse de `--entrypoint`, y el camino
correcto pasa a ser el más corto. **Un procedimiento que exige memoria ya falló una vez** (PT-126).

Estos scripts se ejecutan en el host pero **no ejecutan npm en el host**: invocan Docker. La
invariante se respeta.

### 4. La guarda que impide instalar fuera del contenedor

`preinstall` en los tres puntos de instalación (raíz, `src/api`, `src/admin`): un script que **aborta
si no está dentro de un contenedor Linux**, con el mensaje que dice qué ejecutar en su lugar.

- En el contenedor y en CI (`ubuntu-latest`): pasa, es Linux.
- En Windows o macOS: **falla y no instala nada**.
- **Con caso de control** (RULE-14): forzando la plataforma, la guarda debe fallar. Sin ese caso no
  es una guarda.

Esta pieza es la que convierte «no debe existir ningún `npm install` en mi máquina» de instrucción en
mecanismo. **Es la corrección real del PT.** Detalle a resolver en STATE 3: `src/api` ya tiene
`prepare: cd ../.. && husky install` (`package.json:25`), y hay que comprobar que las dos etapas del
ciclo de vida conviven.

### 5. La guarda que vigila el contenido del lock

Prueba unitaria, patrón de `coherencia-documentacion-codigo.spec.ts`:

> Para cada paquete del lock que declare `optionalDependencies` con variantes por plataforma, el
> árbol instalado debe contener **`linux-x64-gnu`** (imagen de desarrollo, Debian glibc) y
> **`linux-x64-musl`** (imagen de producción, alpine).

Las dos plataformas son las dos que este repositorio construye, y las dos que PT-126 borró. Se lee el
lock **como JSON** y se comprueba **presencia de claves, nunca versiones** — o la prueba se vuelve
frágil y alguien la apagará. Con caso de control.

### 6. Hacer el lock autoritativo: `npm ci`

Mientras CI y las imágenes usen `npm install`, el lock es una sugerencia: cada build vuelve a
resolver y el fichero no gobierna nada. Con los tres locks correctos y seguidos, pasan a `npm ci`:

- los siete jobs de `ci.yml`,
- `src/api/Dockerfile.dev` y `src/api/Dockerfile`,
- los `Dockerfile.dev` de `admin`, `base` y `client` — que hoy copian sólo `package.json`.

**Al final, y con la puerta de salida escrita**: si `npm ci` destapa desajustes entre `package.json`
y el lock, cada uno se corrige **dentro de este PT** (no se difiere: corrección 2). Si aparece un
desajuste que exceda el PT, se vuelve a `npm install` en ese punto concreto y **se dice**, en vez de
dejar CI rojo y que alguien lo desactive en una semana.

### 7. Las dos escrituras

- `CLAUDE.md` § Key Technical Decisions — **`npm install` no se ejecuta en el host: se ejecuta en el
  contenedor.** Con el comando y con lo que pasa si se ignora (murió el arranque un día después).
- `docs/enterprise-documentation/11-Conventions.md` — `RULE-NN` con ejemplo correcto/incorrecto.
- **ADR nuevo** en `docs-v2/transversal/Registro-Maestro-de-ADR.md`: los locks se siguen por git,
  se generan en contenedor, `.gitignore:40` retirado. La decisión que no existía.
- `10-Technical-Debt.md` — **cierre** de lo que este PT resuelve. No entradas nuevas.
- Corregir el comentario de `src/api/Dockerfile:53-62`, que hoy afirma que la variante «existe en
  `package-lock.json`» cuando PT-126 la había borrado el día antes. El parche se **conserva** (un
  cinturón sobre una causa que ya reincidió dos veces no se cambia por una promesa), con una razón
  verdadera escrita.

---

## Los cuatro puntos que la revisión 1 dejaba abiertos: dónde muere cada uno

Exigencia de la corrección 2. **Ninguno queda como nota.**

| # | Punto abierto en la revisión 1 | Dónde se cierra |
|---|---|---|
| 1 | El lock seguido contra `.gitignore:40`, sin decisión | **Pieza C + pieza 7**: se retira la línea, se sigue el de `admin`, y se escribe el ADR que no existía |
| 2 | `msgpackr-extract` compilando desde fuente | **Se cierra como consecuencia de la pieza 1**: con el prebuild de vuelta en el lock, `node-gyp` deja de ser la vía. Verificable: el directorio del prebuild poblado y sin `build/Release/extract.node` |
| 3 | `npm ci` en CI | **Pieza 6**, dentro de este PT |
| 4 | `5c16af4` es un commit sucio | **No es deuda, y por eso no se trabaja**: la historia es append-only y no se reescribe (regla FDGE). Es un hecho registrado y el ejemplo de por qué existe la regla de commits atómicos. Se cita en el ADR y se cierra |

---

## Alternativas rechazadas

| # | Alternativa | Por qué no |
|---|---|---|
| **B** | Parchear `Dockerfile.dev` con `--no-save ...-gnu` | Rechazada en el ACK anterior. Es lo que hizo PT-129 y es la razón de que hoy estemos aquí |
| **C2** | Dejar de seguir los locks, alineándose con `.gitignore:40` | **Decidida en contra arriba**: renuncia a la reproducibilidad, rompe el caché de los siete jobs, y extiende a los tres el problema que ya tiene `admin` |
| **M2** | Regenerar el lock en el host con `--package-lock-only` | **Prohibida por la corrección 1.** No es la peor opción: es inválida por construcción |
| **D** | Volumen nombrado en vez de anónimo para `node_modules` | Fuera de alcance. No corrige nada: mejora el control de la caché que **tapaba** el defecto |
| **E** | Un `.npmrc` que fije la plataforma objetivo | Descartada frente a la pieza 4: fija el resultado pero **no impide** ejecutar npm donde no se debe, que es la invariante que hay que sostener |
| **F** | Retirar `@nestjs-modules/mailer` | Descartada. Es funcionalidad viva. El defecto no es del mailer |

---

## Dependencias

- **Docker operativo**, con permiso para reconstruir imágenes y borrar el volumen anónimo del API.
- Red hacia el registro de npm.
- **Ninguna sobre otro PT.** H-005 (lo único abierto en PTSA) no toca esto.
- La pieza 6 depende de que las piezas 1 y C estén hechas: `npm ci` sobre un lock roto o ausente
  falla, y falla con razón.

---

## Riesgos

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| **R1** | **La invariante «npm sólo en el contenedor» no tiene mecanismo hoy, y ya se violó una vez** | **Alto** — es la causa raíz | **Pieza 4.** Es la única pieza que actúa sobre la cuarta vez; las demás arreglan hoy |
| **R2** | Regenerar los locks mueve versiones además de las entradas de plataforma | Medio | Diffear y revisar entrada por entrada. Lo que se mueva y no sea plataforma **se corrige o se justifica dentro del PT** — no se arrastra |
| **R3** | Verificar sobre el volumen viejo y concluir en falso, en cualquiera de los dos sentidos | **Alto** — es cómo se cierran PT afirmando cosas falsas (PT-127 estuvo a punto) | La evidencia declara: volumen eliminado, `--no-cache`, y el `ls node_modules/@css-inline` de la imagen nueva |
| **R4** | **`npm ci` destapa desajustes lock↔package.json y deja CI rojo** | **Alto** — así muere un control (PT-118) | Pieza 6 **al final**, con puerta de salida escrita: cada desajuste se corrige en el PT; si uno lo excede, ese punto vuelve a `npm install` **y se dice** |
| **R5** | La guarda `preinstall` bloquea algo legítimo — un job de CI, una herramienta, un hook de husky | Medio | Comprobar los siete jobs y `husky`. Se prueba en los dos sentidos, y CI es Linux: debe pasar |
| **R6** | Reconstruir destapa bloqueos apilados debajo, como en PT-129 | Medio | Plausible: el lock lleva un día podado y **sólo se ha ejercido el primer `require` que falla**. Lo que aparezca se corrige en este PT |
| **R7** | `@ironloot/core` (`file:../packages/core`) se resuelve distinto al regenerar y contamina el lock | Medio | Regenerar con el árbol del monorepo presente y **revisar su entrada en el diff** antes de aceptarlo |
| **R8** | **El PT crece más que el defecto que lo motivó** | Medio, y consciente | Se declara: el entorno vuelve a estar vivo al terminar la pieza 2. Las piezas 3-7 son el mecanismo, y se pueden ver como fase 2 del mismo PT. **Recortarlo es decisión humana, no mía** |

---

## Análisis de regresión (obligatorio — MAJOR)

| Superficie | ¿Se toca? | Riesgo de regresión |
|---|---|---|
| `src/api/src/` y el resto del producto | **No** | Ninguno. Ni un fichero |
| `schema.prisma`, migraciones | **No** | Ninguno. La migración se aplica bien hoy: **no es la causa** aunque el log invite a mirarla |
| **Versiones instaladas** (los tres locks) | **Sí, indirecto** | **El riesgo real.** Lo cubren R2, las 919 unitarias, las 77 e2e y `npm audit --omit=dev` |
| `.gitignore` | **Sí** — se retira la línea 40 | Ninguno funcional. Efecto: tres ficheros pasan a estar seguidos |
| `src/admin/package-lock.json` | **Sí** — se regenera y se sigue | Primer lock compartido de ADMIN: su árbol pasa a ser reproducible. Riesgo de que su regeneración mueva versiones → mismas 13 unitarias de ADMIN |
| **`ci.yml` — los siete jobs** | **Sí** — `npm install` → `npm ci` | **El mayor riesgo de regresión del PT.** Cubierto por R4 y por el orden |
| **Los cinco Dockerfile** (`.dev` y producción) | **Sí** — a `npm ci`, y `COPY package*.json` donde falte | Los tres SSR hoy construyen **sin lock**: pasan a construir con él. Cambia lo que instalan. **Exige arrancar los cuatro y verlos `healthy`**, como exigió la aceptación de PT-129 |
| `docker-compose.yml` | **No** | Ninguno |
| `package.json` (raíz, api, admin) | **Sí** — `preinstall` y scripts `lock:*` | Un `preinstall` mal escrito **bloquea toda instalación, en todas partes**, CI incluido. R5 |

**Flujos que hay que ver funcionar, no deducir:**

1. Los ocho contenedores `healthy`, con volumen limpio e imágenes `--no-cache`.
2. **Notificaciones por correo**: es el módulo que arrastra `@css-inline`. El binario puede cargar y
   el adaptador de Handlebars no rendir el HTML, y el arranque no lo delataría. **Un correo real,
   visto en Mailhog.**
3. 919 unitarias + 77 e2e + 136 por navegador.
4. **Las cuatro imágenes de producción**, construidas y arrancadas hasta `healthy`.
5. `npm audit --omit=dev` = 0 en los cinco proyectos.
6. **Un `npm install` en el host debe fallar** — y con el mensaje útil.
7. Un push real: que los siete jobs pasen con `npm ci`.

---

## Criterios de éxito

| # | Criterio | Comprobación |
|---|---|---|
| 1 | El lock del API declara las tres plataformas | Contiene `-gnu`, `-musl` **y** `win32-x64-msvc` |
| 2 | La imagen nueva lleva el binario | `docker run --rm --entrypoint sh ironloot-api:latest -c 'ls node_modules/@css-inline'` → ≥2 directorios |
| 3 | **Los ocho contenedores `healthy`** desde volumen limpio | `down -v` → `build --no-cache` → `up -d` → `docker ps` |
| 4 | El correo se rinde de verdad | Correo real visible en Mailhog (`:8026`) |
| 5 | `msgpackr` usa prebuild, no compilación | Prebuild presente y **sin** `msgpackr-extract/build/Release/extract.node` |
| 6 | **Un `npm install` en el host falla** | Ejecutarlo y ver el error. **Y el caso de control de la guarda** |
| 7 | **La guarda del lock se ha visto fallar** | Lock de prueba sin `-gnu` → la prueba falla; con el real → pasa |
| 8 | Sin regresión | 919 unitarias + 77 e2e + 136 navegador · `lint` 0 · `npm audit --omit=dev` = 0 ×5 |
| 9 | Las cuatro imágenes de producción arrancan | `build` + `run` hasta `healthy` |
| 10 | `npm ci` en los siete jobs, en verde, **en un push real** | Los jobs, vistos. No inferidos |
| 11 | `.gitignore:40` retirado y los tres locks seguidos | `git ls-files` los muestra |
| 12 | **Cero deuda nueva y cuatro entradas cerradas** | `10-Technical-Debt.md` + el ADR nuevo |

**Los criterios 6 y 7 son los que deciden si este PT vale algo.** Los otros diez arreglan hoy; esos
dos son los únicos que actúan sobre la próxima vez.

---

## Restricciones

- **Prohibido `npm install` en el host.** Cualquier paso que lo requiera es inválido por construcción.
- **Cero deuda diferida.** «Registrado para más adelante» no está disponible.
- **El producto no se toca.** Ni un fichero de `src/api/src/`.
- **`docker-compose` no cambia de comportamiento**: es el entorno de todos los días.
- **`src/api/scripts/` no está montado como volumen** (HANDOFF, trampa nº 2): tocar el Dockerfile
  exige `docker-compose build api`. Inevitable aquí.
- **RULE-10 no aplica**: no se toca `schema.prisma`. Se dice porque la migración es lo primero que uno
  mira al ver este log, y es el camino equivocado.
- **RULE-14**: las dos guardas se prueban en los dos sentidos, o no se escriben.
- **La historia no se reescribe**: `5c16af4` se queda como está.

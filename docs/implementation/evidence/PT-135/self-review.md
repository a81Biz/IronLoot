# PT-135 — Self-Review (STATE 5)

**Fecha**: 2026-07-28 · **Rama**: `fix/PT-135-locks-en-contenedor` · **Origen**: reporte humano

---

## Resultado, sin adornos

**El entorno vuelve a estar vivo, y el mecanismo que impide la cuarta vez está puesto y visto
fallar.** Diez commits atómicos, cero ficheros de `src/api/src/` tocados.

```
ironloot-api       Up (healthy)      <- el que no arrancaba
ironloot-admin     Up (healthy)
ironloot-base      Up (healthy)
ironloot-client    Up (healthy)
ironloot-db        Up (healthy)
ironloot-redis     Up (healthy)
ironloot-nginx     Up
ironloot-mailhog   Up
```

Y las cuatro imágenes de **producción**, construidas con `npm ci` y arrancadas:

```
pt135-api      Up (healthy)
pt135-admin    Up (healthy)
pt135-base     Up (healthy)
pt135-client   Up (healthy)
```

---

## El antes y el después

**Antes** (`docker logs ironloot-api`):

```
Error: Cannot find module '@css-inline/css-inline-linux-x64-gnu'
- @nestjs-modules/mailer/dist/adapters/handlebars.adapter.js
- dist/modules/notifications/notifications.module.js -> scheduler -> app.module -> main
Health.FailingStreak: 6   ·   nginx/admin/base/client: Created
```

**Después** (`ls node_modules/@css-inline` en la imagen reconstruida `--no-cache`):

```
css-inline
css-inline-linux-x64-gnu
css-inline-linux-x64-musl
msgpackr-extract-linux-x64        <- prebuild, y sin build/Release: ya no compila desde fuente
```

**Declarado explícitamente, porque es la trampa nº 3 del `HANDOFF`**: la verificación se hizo con el
**volumen anónimo eliminado** (`docker compose rm -fsv api`) y `build --no-cache`. El volumen viejo
tapaba el defecto y habría tapado igual un arreglo falso. Los volúmenes **nombrados** (`ironloot_
postgres_data`, `ironloot_redis_data`) **no se tocaron**: el plan decía `down -v`, que los habría
borrado, y eso fue un error del plan corregido antes de ejecutar.

---

## Lo que cambió respecto al plan, y por qué

| # | Desviación | Motivo |
|---|---|---|
| 1 | **El mecanismo M1 tal como estaba escrito no funciona** | Medido: `--package-lock-only` responde «up to date» y no toca nada. Y regenerar desde cero **tampoco basta** si el `node_modules` del host está visible: npm deriva el árbol del **real**, y el del host es de Windows. Hay que enmascararlo. Y `--ignore-scripts`, o `husky` sin git sale con **127** dejando el lock a medio escribir |
| 2 | **La exigencia de «conservar también win32» se cae** | Con la invariante en vigor, si nadie instala en Windows el lock no necesita el binario de Windows. La guarda exige **las dos plataformas que construimos**. (En la práctica la regeneración conserva las 17, así que no se pierde nada) |
| 3 | **`docker compose down -v` → `rm -fsv api`** | `down -v` borra los volúmenes **nombrados**: se habría llevado la base de datos. Error del plan |
| 4 | **BASE y CLIENT se quedan en `npm install`** | Son workspaces: su lock es el de la raíz, que está **fuera de su contexto de build** (acotado por PT-126). `npm ci` exigiría deshacer esa decisión. Y la ganancia no existe: el lock de la raíz tiene **cero** paquetes por plataforma. Declarado en los dos `Dockerfile` |
| 5 | **`postinstall` de la raíz también a `npm ci`** | No estaba en el plan y hacía falta: es por donde CI instala `api` y `admin`, justo los dos locks que este PT arregla |
| 6 | **Un cuarto lock, que nadie sabía que existía** | Retirar `.gitignore:40` destapó `tests/qa-browser-suite/package-lock.json`. Instala en el host **a propósito** (Playwright conduce un navegador real): excepción **declarada y vigilada** por una prueba que exige que siga con cero paquetes por plataforma |
| 7 | **La guarda documental de PT-130 se extiende a la prosa** | No estaba en el plan. Al añadir una línea a `package.json` desplacé las cinco citas de la tabla, la guarda las cazó, y al corregirlas aparecieron **tres citas de prosa** rotas desde antes. Corregir sin guarda es dejarlo podrirse otra vez |
| 8 | **Una regresión de seguridad propia** | Regenerar el lock trajo **2 avisos altos** donde había 0. Corregido dentro del PT como manda `audit:check`: override **acotado** para `minimatch` 9.0.9 y `audit fix` sin `--force` |

---

## Lista de comprobación FDGE

- [x] **¿Criterios de éxito verificados?** Once de doce; el 10 no depende de mí.

  | # | Criterio | Resultado |
  |---|---|---|
  | 1 | El lock declara las tres plataformas | ✅ 17 paquetes de plataforma, como antes de PT-126 |
  | 2 | La imagen nueva lleva el binario | ✅ `-gnu`, `-musl` y el prebuild de `msgpackr` |
  | 3 | **Los ocho contenedores `healthy`**, volumen limpio | ✅ |
  | 4 | El correo se rinde de verdad | ✅ visto en Mailhog. **Y con mejor prueba de la buscada**: la plantilla es un fragmento sin `<html>`, y el correo llega envuelto en `<html><head></head><body>` — **ese envoltorio lo pone `@css-inline`**, o sea que el binario se ejecutó. Sin `style=` porque la plantilla no tiene CSS: mi primera comprobación exigía algo que no aplica |
  | 5 | `msgpackr` con prebuild, no compilando | ✅ sin `build/Release/extract.node` |
  | 6 | **Un `npm install` en el host falla** | ✅ `npm --prefix ./src/api install` aborta y **el lock queda intacto** |
  | 7 | **Las guardas vistas fallar** | ✅ G1 en RED nombrando los dos paquetes · G2 en RED en sus ocho pruebas · 7 casos de control |
  | 8 | Sin regresión | ✅ **944/944** unitarias · **77/77** e2e · `lint` 0 errores · `npm audit --omit=dev` **0** en los cinco · `audit:check` **OK** |
  | 9 | Las cuatro imágenes de producción arrancan | ✅ las cuatro `healthy` |
  | 10 | `npm ci` en los siete jobs, **en un push real** | ⏳ **no verificable por mí**: exige empujar. Ensayado en contenedor: `npm ci` en la raíz, exit 0, con el `postinstall` instalando los dos |
  | 11 | `.gitignore:40` retirado, los tres locks seguidos | ✅ y el cuarto, declarado |
  | 12 | Cero deuda nueva | ✅ TD-017 abierta y cerrada aquí. Ninguna entrada nueva |

- [x] **¿Efectos colaterales?** Dos, medidos y contenidos: la regresión de auditoría (corregida) y el
      desplazamiento de las citas del TRD (corregido y ahora vigilado).

- [x] **¿Convenciones respetadas?** RULE-14 en las dos guardas nuevas (7 casos de control). RULE-15
      es de este PT. Commits atómicos y trazables.

- [x] **¿Sin artefactos de depuración?** Los cuatro contenedores `pt135-*` y las imágenes
      `ironloot-*:pt135` se eliminan al cerrar.

- [x] **¿Documentación actualizada?** `CLAUDE.md`, `11-Conventions.md` (RULE-15), ADR-048,
      `10-Technical-Debt.md` (TD-017 cerrada), `03-TRD.md` (ocho citas).

---

## Un apunte sobre el proceso, porque es la clase de cosa que se pierde

**Un hook metió tres ficheros en el commit equivocado.** `lint-staged` tiene tarea para
`package.json`, y al commitear sólo la prueba se llevó consigo los tres manifiestos modificados que
estaban sin preparar. Los dos commits se rehicieron con contenido idéntico y reparto correcto —la
rama no estaba publicada— y desde entonces el manifiesto se aparta con `git stash` antes de commitear
una prueba. Es un detalle, pero «commits atómicos» dejó de ser cierto durante dos minutos sin que
nada avisara.

---

## Dos hallazgos ajenos a este PT, registrados y no maquillados

Están en `DISCOVERY.md` § Revisión U-002. **No son deuda diferida de PT-135**: son defectos
preexistentes que aparecieron al recorrer el camino entero, y cada uno necesita su PT.

**F-135-A — `REDIS_URL` parece la palanca y no lo es.** Dos de los tres clientes de Redis
(`app.module.ts:61`, `throttler-redis.module.ts:31`) leen `REDIS_HOST`/`REDIS_PORT` con reserva
`localhost`; sólo `distributed-lock.service.ts` lee `REDIS_URL`. `docker-compose.yml` declara **sólo
`REDIS_URL`**, y lo que hace funcionar el contenedor de desarrollo es `REDIS_HOST=redis` dentro de
`src/api/.env`, **un fichero que no está en git**. La imagen de producción no lo tiene: al arrancarla
con lo que el compose sugiere, la aplicación arranca bien y el healthcheck la marca `unhealthy` con un
mensaje sobre `maxRetriesPerRequest` que no menciona Redis. Familia de PT-111/F-39.

**F-135-B — ocho guardas no pueden correr dentro del contenedor de desarrollo.** Leen el árbol del
monorepo y `docker-compose` no lo monta, así que `RAIZ` resuelve a `/`. La de PT-129 falla ahí con
`ENOENT` y **0 pruebas ejecutadas**. Pasan en CI y en el host. Choca con la invariante de este PT: si
npm se ejecuta en el contenedor, esta familia de pruebas no puede correr ahí. La vía usada aquí queda
registrada como referencia.

Y un tercero, menor, de la misma familia: **`security-baseline.json` no viaja al contenedor** (no está
montado ni copiado por la imagen), así que `audit:check` ejecutado dentro falla con «No hay línea
base» aunque el fichero exista y esté en git.

---

## Estado

**`VALIDATION_PENDING`.** Es un BUG: **lo cierra el humano**, no yo.

Lo que falta para cerrarlo: el criterio 10 —ver los siete jobs en verde en un push real— y el VoBo
sobre lo demás.

# PT-138 — Design: que las guardas puedan correr donde se ejecuta npm

**Tipo**: BUG · **Complejidad**: STANDARD · **Origen**: F-135-B (`DISCOVERY.md` § Revisión U-002)
**Depende de**: PT-136

## El defecto: una contradicción entre dos reglas del propio repositorio

**RULE-15** (PT-135): npm no se ejecuta en el host, se ejecuta en el contenedor. Sin puerta de escape
— `scripts/solo-en-contenedor.js` lo impide como `preinstall`.

**Y en ese contenedor, ocho guardas no pueden correr.**

```
$ docker exec ironloot-api npx jest --testPathPattern="healthcheck-apunta-a-ruta-real"
    readFileSync(join(RAIZ, 'src/api/src/main.ts'))
    ENOENT   ->  Test Suites: 1 failed | Tests: 0 total
```

`RAIZ = join(__dirname, '..' ×5)` resuelve a `/` dentro del contenedor: `docker-compose` monta
`/app/src`, `/app/test`, `/app/prisma` y `/packages/core`, **pero no el árbol del monorepo**.

Los ocho: `job-de-integracion` · `rutas-que-el-client-invoca` · `coherencia-documentacion-codigo` ·
`capturas-en-su-sitio` · `endpoints-legados-retirados` · `coherencia-deuda-tecnica` ·
`healthcheck-apunta-a-ruta-real` · `lock-declara-plataformas`.

## Y dos síntomas más, de la misma causa, que no estaban registrados

Medidos el 2026-07-28 dentro del contenedor:

```
$ docker exec ironloot-api npm run audit:check
[audit:check] FALLA — No hay linea base (`security-baseline.json`).
        ^ el fichero existe y esta en git; no viaja al contenedor

$ docker exec ironloot-api npm run audit:observability
/bin/sh: 1: docker: not found
  trace_completeness = SIN_DATOS
  ...
  OK — sin silencios nuevos          <- y aqui esta lo grave
```

**`audit:observability` no falla: devuelve `SIN_DATOS` y luego dice `OK`.** El checkpoint D3 consulta
la base de datos invocando `docker exec ironloot-db psql`, y dentro del contenedor no hay CLI de
docker.

Eso es literalmente lo que PT-122 aprendió a no tolerar cuando reclasificó `audit:domain` y
`audit:reliability` como métricas de delta sync: *«en CI nace vacía y devolverían `SIN_DATOS` siempre,
que alguien acabaría leyendo como verde»*. La lección está escrita en `CLAUDE.md` — y la métrica de al
lado la incumple.

## Por qué importa ahora y no antes

Hoy convive porque el `node_modules` del host ya existe de antes. **En una máquina limpia, quien siga
RULE-15 al pie de la letra no puede ejecutar ocho guardas ni dos checkpoints.** Y hasta PT-136 tampoco
los ejecutaba CI.

El hueco completo, escrito sin adornos: **esos controles no se ejecutan hoy en ningún sitio salvo a
mano, por alguien que conozca la invocación de tres volúmenes.**

## Decisiones de arquitectura

### D1 — Montar la raíz del monorepo en el servicio `api`

Es la causa, y se ataca ahí. Los ocho pasan dentro y `security-baseline.json` viaja solo, sin ninguna
excepción por fichero.

**Riesgo real y cómo se acota**: el servicio ya monta `/app/src`, `/app/test`, `/app/prisma`. Montar
además la raíz puede solapar rutas y confundir al watch de desarrollo. Por eso la raíz se monta en un
punto **distinto** (p. ej. `/repo`, en sólo lectura) y `RAIZ` se resuelve a él cuando existe. No se
reorganizan los montajes que ya funcionan.

`docker-compose.yml` estaba declarado «sin cambios de comportamiento» en PT-135; **este PT es el que
levanta esa restricción**, con su razón escrita.

### D2 — `observability-check.ts` deja de depender del CLI de docker

Habla con la base por `DATABASE_URL`, como el resto del repositorio. Un script de auditoría que
invoca `docker exec` sólo funciona desde fuera del contenedor — y RULE-15 dice que se ejecuta dentro.

### D3 — `SIN_DATOS` sale con código distinto de cero

**La pieza más importante de este PT.** Sin ella, D1 y D2 arreglan el caso y dejan la clase viva.

```
hoy:      trace_completeness = SIN_DATOS   ...   OK — sin silencios nuevos   (exit 0)
despues:  trace_completeness = SIN_DATOS   ...   FALLA — no se pudo medir    (exit != 0)
```

Es la regla que `audit:schema` ya aplica —*«un error de ejecución no es un aprobado»*— y que
`audit:observability` no. Se unifica.

### D4 — La vía del contenedor desechable se documenta como alternativa, no como norma

```
docker run --rm -v <raiz>:/repo -v <volumen_node_modules>:/repo/src/api/node_modules \
  -w /repo/src/api node:20-slim npx jest --testPathPattern=... --no-coverage
```

Funciona, se usó en PT-135, y **nadie la adivina**. Queda escrita en `CLAUDE.md` para el caso en que
alguien necesite un contenedor limpio. Pero la vía normal pasa a ser `docker exec` sobre el servicio,
que es lo que la gente ya escribe.

## Alternativa rechazada

**Comandos `test:guardas` que envuelvan el contenedor desechable, sin tocar el compose.** Conservada
como documentación (D4), rechazada como solución: deja la contradicción de RULE-15 en pie y obliga a
cada persona a conocer una invocación de tres volúmenes para correr una prueba.

## Lo que este PT NO decide

- **No cambia cómo resuelven `RAIZ` los ocho ficheros** más allá de lo mínimo para que funcione en los
  tres sitios (host, contenedor, CI). No se reescribe la familia.
- **No toca el contenido de los checkpoints**: qué mide D3 sigue igual; cambia de dónde saca el dato y
  cómo se comporta cuando no lo tiene.

# PT-136 — Evidencia: las cuatro corridas

**Rama**: `fix/PT-136-ci-que-se-ejecuta` → fusionada en `master` (7e6bcef)

> Este documento está en `.md` **a propósito**. `.gitignore:161` versiona los `.md` de
> evidencia y excluye los volcados, y la política es razonable — pero un documento de
> validación que cite un volcado estaría citando algo que **no está en el repositorio**. Es lo
> que ya pasa con `PENDING_TASKS.md:58`, que manda validar PT-135 leyendo `regresion.txt`.
> Registrado como **F-136-A**.

```
PT-136 — LINEA BASE: el pipeline que nunca se habia ejecutado
Capturado el 2026-07-28, ANTES de tocar nada.

================================================================================
1. EL DISPARADOR
================================================================================

$ sed -n '3,7p' .github/workflows/ci.yml
on:
  push:
    branches: [dev, qa, prep, prod]
  pull_request:
    branches: [dev, qa, prep, prod]

Sin `workflow_dispatch`: tampoco se podia lanzar a mano.

================================================================================
2. LAS RAMAS QUE EXISTEN
================================================================================

$ git branch -r
  origin/HEAD -> origin/master
  origin/master

Una. Las cuatro del disparador no existen, y no han existido nunca: son los
nombres de una convencion de ramas que este proyecto no adopto.

================================================================================
3. LA CONSECUENCIA
================================================================================

$ gh api repos/a81Biz/IronLoot/actions/runs --jq '.total_count'
0

$ gh run list --limit 10
(vacio)

$ gh workflow list
CI      active  217843014
        ^^^^^^ GitHub lo lista como activo. Por eso nadie vio nunca un error.

CERO EJECUCIONES EN TODA LA HISTORIA DEL REPOSITORIO.

================================================================================
4. LO QUE ESO DEJABA SIN CUBRIR
================================================================================

Ocho jobs escritos y correctos:
  lint · security-audit · schema-drift · test-unit · test-integration
  observabilidad · build · docker

De ellos, TRES son checkpoints de auditoria que CLAUDE.md declara vigilados en
CI y **sin `needs` a proposito**, para que un job roto no pueda ocultarlos:

  schema-drift    D2 — las migraciones reproducen schema.prisma   (desde PT-127)
  security-audit  D2 — vulnerabilidades vs security-baseline.json (desde PT-118)
  observabilidad  D3 — catch mudos y traza completa               (desde PT-121)

Ejecuciones reales de cada uno: 0.

El razonamiento sobre `needs` era correcto. Lo que nunca se comprobo fue si el
workflow llegaba a arrancar.

================================================================================
5. Y EL CRITERIO 10 DE PT-135
================================================================================

HANDOFF.md:49-52 y PENDING_TASKS.md:32 pedian:
  1. "Empujar master"           -> ya estaba empujado:
                                   git rev-list --left-right --count master...origin/master
                                   0       0
  2. "Ver los siete jobs en verde en un push real"
                                   -> imposible: empujar master no disparaba nada.
                                   -> y son OCHO jobs, no siete.

Un registro pidiendo algo ya hecho, para lograr algo que no podia pasar.
```

```
PT-136 — LAS TRES CORRIDAS, JOB A JOB
Rama: fix/PT-136-ci-que-se-ejecuta

================================================================================
ANTES
================================================================================
gh api repos/a81Biz/IronLoot/actions/runs --jq .total_count   ->  0
(ver 00-linea-base.txt)

================================================================================
CORRIDA 1 — 30407680568   (workflow_dispatch, estreno)
================================================================================
  failure   Lint & Type Check
  success   Dependencias vulnerables (D2)     <- 1a ejecucion real. PASA
  failure   Deriva del esquema (D2)
  success   Observabilidad (D3)               <- 1a ejecucion real. PASA
  skipped   Unit Tests            (needs: lint)
  skipped   Integration Tests     (needs: lint)
  skipped   Build
  skipped   Docker Build

TRIAJE (regla escrita ANTES de mirar, design.md D3):

  [lint] Cannot find module '@ironloot/core' x8
    -> DEFECTO DEL JOB. Se corrige aqui.
    `@ironloot/core` se resuelve por dist/, y dist/ esta en .gitignore:73.
    Ningun job lo construia. Y el `build` de la raiz lo ponia EL ULTIMO,
    despues de sus cuatro consumidores.
    Reproducido en local borrando dist/: los mismos 8 errores, exactos.

  [schema-drift] P1003 Database `ironloot_test_shadow_check` does not exist
    -> DEFECTO DEL JOB. Se corrige aqui.
    El comentario del job afirmaba «La base sombra la crea y la destruye
    Prisma; solo necesita poder conectarse». FALSO: migrate diff
    --from-migrations exige que ya exista.
    El checkpoint D2 de esquema, en CI desde PT-127, NO HABIA COMPARADO
    UN ESQUEMA NI UNA VEZ.

================================================================================
CORRIDA 2 — 30407968332
================================================================================
  success   Lint & Type Check                 <- corregido
  success   Dependencias vulnerables (D2)
  success   Deriva del esquema (D2)           <- corregido. COMPARA POR 1a VEZ
  success   Observabilidad (D3)
  failure   Unit Tests                        <- 1a ejecucion. 701/702
  failure   Integration Tests                 <- 1a ejecucion
  skipped   Build
  skipped   Docker Build

TRIAJE:

  [test-unit] 1 failed, 701 passed
    ● PT-136 › casos de control › C2: acepta una rama que si existe
      Expected value: "master"
      Received array: ["fix/PT-136-ci-que-se-ejecuta"]
    -> DEFECTO DE LA GUARDA NUEVA (mia). Se corrige aqui.
    El chequeo DE VERDAD paso: resolvio `master` por la via del remoto, que
    es para lo que estaba puesta. Lo que fallo fue el CASO DE CONTROL,
    escrito contra el estado de mi maquina en vez de contra el contrato.
    Un caso de control que solo pasa en un sitio no controla nada.
    Es la CUARTA vez que una guarda de este repositorio se acusa a si misma.

  [test-integration] 17 ficheros: «Cannot read properties of undefined
                                   (reading 'close')»
    -> DEFECTO DEL JOB. Se corrige aqui.
    Causa real: MercadoPagoProvider lanza en su constructor si falta el
    token; payments.module.ts:46 lo construye con avidez; con el modulo de
    pagos caido no arranca NINGUN test.
    La suite pasaba en el host por src/api/.env, UN FICHERO QUE NO ESTA EN
    GIT. Misma familia que F-135-A, segunda aparicion dentro de este PT.

================================================================================
CORRIDA 3 — 30408275255
================================================================================
  success   Lint & Type Check
  success   Dependencias vulnerables (D2)
  success   Deriva del esquema (D2)
  success   Observabilidad (D3)
  success   Unit Tests                        <- 702/702
  failure   Integration Tests                 <- 66/77 (3 suites, 11 tests)
  skipped   Build
  skipped   Docker Build

TRIAJE:

  [test-integration] system-config.service.ts:194
      Unique constraint failed on the fields: (`key`)
    -> DEFECTO DEL REPOSITORIO (produccion). **PT-142**, NO se toca aqui.
    findUnique + create sin atomicidad, en onModuleInit: ocurre en CADA
    arranque. Dos instancias a la vez chocan. Riesgo real de despliegue
    progresivo, no solo de tests.

  [test-integration] auth-helper.ts:108
      Foreign key constraint violated: auctions_seller_id_fkey
    -> DEFECTO DEL REPOSITORIO (tests). **PT-143**, NO se toca aqui.
    La suite no aisla datos entre workers y la limpieza borra usuarios que
    aun tienen subastas.

  Ambos invisibles en local por la MISMA razon: una base con historia tapa
  lo que una base vacia destapa. Es la leccion de PT-122 dada la vuelta.

================================================================================
ESTADO FINAL DE PT-136
================================================================================
Ejecutan y PASAN:   6 de 8
                    lint · security-audit · schema-drift · observabilidad
                    test-unit · (y test-integration EJECUTA, con 66/77)

NO se han ejecutado: build · docker
                    Cuelgan de test-integration, que esta rojo por PT-142.
                    NO se silencian: rojo y visible es lo que este PT compra.

Los TRES checkpoints de auditoria tienen ejecucion real por primera vez.

================================================================================
CORRIDA 4 — 30408707627   *** DISPARADA POR PUSH A MASTER ***
================================================================================
Tras fusionar PT-136 (merge 7e6bcef). Es la PRIMERA corrida de CI de este
repositorio disparada por un push, no a mano.

  evento: push        rama: master

  success   Lint & Type Check
  success   Dependencias vulnerables (D2)
  success   Deriva del esquema (D2)
  success   Observabilidad (D3)
  success   Unit Tests
  failure   Integration Tests        <- PT-142, no se toca
  skipped   Build
  skipped   Docker Build

Resultado IDENTICO al de la corrida 3 por workflow_dispatch. Que coincidan
importa: descarta que algo dependiera de la rama o del modo de disparo.

--- Sobre el criterio 10 de PT-135 -------------------------------------------

`npm ci` gobernado por los locks de PT-135 se ejecuto en un PUSH REAL, en los
seis jobs que corrieron, y ninguno fallo por instalacion. Eso es lo que el
criterio 10 pedia y no se habia podido comprobar nunca.

Lo que NO se puede declarar todavia: los ocho jobs en verde. `build` y `docker`
siguen sin ejecutarse — cuelgan de test-integration, rojo por PT-142.
```

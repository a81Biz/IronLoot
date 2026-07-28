# PT-136 — Escenarios de prueba

## La guarda: `ramas-del-disparador-existen.spec.ts`

| # | Escenario | Entrada | Esperado |
|---|---|---|---|
| AC-01 | **RED inicial** | `ci.yml` de `master` (dev/qa/prep/prod) | **Falla**, nombrando las cuatro ramas inexistentes |
| AC-02 | **GREEN** | `ci.yml` con `branches: [master]` | Pasa |
| AC-03 | **Control — rama inventada** | workflow ficticio con `branches: [no-existe-jamas]` | **Falla**. Demuestra que sabe fallar |
| AC-04 | **Control — sólo `workflow_dispatch`** | `on: workflow_dispatch:` sin `branches:` | Pasa. No revienta por ausencia de la clave |
| AC-05 | **Control — remoto irresoluble** | Sin refs remotos disponibles | **Falla**. Nunca se salta. `SIN_DATOS` no es aprobado |
| AC-06 | **Varios workflows** | Dos ficheros en `.github/workflows/`, uno correcto y otro no | Falla, y **nombra cuál** de los dos |
| AC-07 | **Ramas en `pull_request`** | `push` correcto, `pull_request` con rama inventada | **Falla**. Las dos listas se comprueban, no sólo `push` |

## La corrida real: los ocho jobs

| # | Job | Qué se comprueba | Criterio |
|---|---|---|---|
| CI-01 | `lint` | Arranca y termina | Ejecutado |
| CI-02 | `security-audit` | **Checkpoint D2.** Primera ejecución real en la historia | Ejecutado + veredicto emitido |
| CI-03 | `schema-drift` | **Checkpoint D2.** Las migraciones reproducen `schema.prisma` contra un postgres de servicio | Ejecutado + veredicto |
| CI-04 | `test-unit` | 944 unitarias | Ejecutado |
| CI-05 | `test-integration` | 77 e2e con esquema aplicado | Ejecutado |
| CI-06 | `observabilidad` | **Checkpoint D3.** `SIN_DATOS` **cuenta como fallo** | Ejecutado + veredicto ≠ SIN_DATOS |
| CI-07 | `build` | Compila los cinco proyectos | Ejecutado |
| CI-08 | `docker` | Construye **y arranca** las imágenes con su healthcheck | Ejecutado |

**Criterio de la tanda CI-01…08 en PT-136.4**: los ocho **arrancan**. El verde es de PT-136.6, y sólo
para lo que sea defecto del job.

## `npm ci` gobernado por los locks de PT-135

| # | Escenario | Esperado |
|---|---|---|
| LOCK-01 | `npm ci` en la raíz, en CI | Exit 0, con el `postinstall` instalando api y admin |
| LOCK-02 | Los binarios de plataforma de Linux presentes tras `npm ci` | `@css-inline/*-linux-x64-gnu` en el árbol |
| LOCK-03 | `lock-declara-plataformas.spec.ts` corre **en CI** por primera vez | Verde |

> LOCK-01 se ensayó en contenedor durante PT-135 (exit 0). **Ensayar no es ejecutar en CI**, y por eso
> sigue siendo escenario y no dato.

## Cierre del criterio 10 de PT-135

| # | Escenario | Esperado |
|---|---|---|
| P135-01 | Push real a `master` dispara la corrida | `gh run list` no vacío; `head_sha` = commit de merge |
| P135-02 | Los ocho jobs con su resultado, visible | Corrida enlazable desde la evidencia |

## Regresión

| # | Suite | Línea base |
|---|---|---|
| REG-01 | Unitarias | **944** (API 691 · CORE 134 · CLIENT 103 · ADMIN 13 · BASE 3) |
| REG-02 | e2e | **77** |
| REG-03 | Navegador | **176** |
| REG-04 | `lint` | 0 errores |
| REG-05 | `npm audit --omit=dev` | 0 en los cinco |

## Lo que NO se prueba aquí

- Que los ocho jobs terminen **en verde**. Si un test real falla, el test es de otro PT (D3).
- El contenido de los checkpoints. PT-136 prueba que **se ejecutan**, no que su veredicto sea bueno.

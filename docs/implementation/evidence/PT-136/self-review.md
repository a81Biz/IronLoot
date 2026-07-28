# PT-136 — Self-Review

**Fecha**: 2026-07-28 · **Rama**: `fix/PT-136-ci-que-se-ejecuta` · **Estado**: `VALIDATION_PENDING`
Es un BUG: **lo cierra el humano.**

## Lo que este PT consigue

**El pipeline de CI de este repositorio se ejecuta.** Antes de hoy no lo había hecho **nunca**:
`gh api .../actions/runs → total_count: 0`, en toda la historia del proyecto.

Cuatro corridas, con su triaje, en **`corridas-de-ci.md`** — en `.md` a propósito: `.gitignore:161`
excluye los volcados de evidencia, así que un `.txt` citado desde aquí sería una cita a algo que **no
está en el repositorio**. Ver **F-136-A** más abajo.

## Criterios de éxito — uno por uno, sin adornos

| # | Criterio | Estado |
|---|---|---|
| 1 | Los 8 jobs se ejecutan en un push real | ⚠️ **6 de 8.** `build` y `docker` siguen sin ejecutarse: cuelgan de `test-integration`, rojo por **PT-142**. Y las tres corridas fueron por `workflow_dispatch`, no por push |
| 2 | Lo que salga rojo, triado y registrado | ✅ Los seis fallos, clasificados. Cuatro corregidos aquí (defectos del job), **dos abren PT-142 y PT-143** |
| 3 | Los tres checkpoints con ejecución real | ✅ `security-audit`, `schema-drift` y `observabilidad`, los tres en verde. `schema-drift` **comparó un esquema por primera vez** |
| 9 | La guarda nueva en verde con casos de control | ✅ 11 casos, 7 de control |
| 14 | Criterio 10 de PT-135 cerrado | ⚠️ **Parcial.** Se demostró que era inalcanzable y por qué. Verlo en verde entero exige PT-142 |
| 15 | Regresión sin pérdidas | ✅ **702/702** unitarias (691 previas + 11 nuevas), 94 suites |

**No declaro cumplido el criterio 1.** Seis de ocho no son ocho, y `build`/`docker` siguen sin haberse
visto nunca. Decirlo de otra forma sería el tipo de aproximación que este PT existe para eliminar.

## Lo que encontré y no esperaba

Cuatro defectos reales, todos invisibles por la misma razón —CI no corría— y **dos de ellos por una
segunda capa** que conviene nombrar:

1. **`@ironloot/core` no se compilaba en ningún job.** `dist/` está en `.gitignore:73`. Ocho ficheros
   del API no compilaban. Y el `build` de la raíz construía core **el último**, después de sus cuatro
   consumidores: el job `build` habría fallado igual. Tapado porque en el host el `dist/` sobrevive de
   una compilación anterior.
2. **La base sombra no la crea Prisma.** El comentario del job afirmaba que sí. El checkpoint D2 de
   esquema, declarado en CI desde PT-127, **no había comparado un esquema ni una vez**.
3. **La suite e2e vivía de `src/api/.env`**, un fichero que no está en git. Familia de F-135-A.
4. **PT-142 y PT-143**, que no toco: una carrera en código de producción y una suite sin aislamiento.

**El patrón, dicho una vez**: en tres de los cuatro, lo que hacía funcionar el sistema no era lo que
estaba declarado, sino un residuo del entorno de alguien — un `dist/` viejo, un `.env` local, una
base con historia.

## El error propio, que es el que más vale anotar

**Mi guarda se acusó a sí misma en la primera corrida de CI.** El caso de control C2 comprobaba
`conocidas.includes('master')` directamente; en CI el checkout de una rama trae sólo su referencia, y
`conocidas` era `["fix/PT-136-ci-que-se-ejecuta"]`.

Lo que importa de esto: **el chequeo de verdad pasó** —resolvió `master` por la vía del remoto, que es
justo para lo que estaba puesta—. Lo que falló fue el control, escrito contra el estado de mi máquina
en vez de contra el contrato. Un caso de control que sólo pasa en un sitio no controla nada.

Van cuatro veces que una guarda de este repositorio se acusa a sí misma, y sigue siendo la mejor señal
de que sirven.

## Lo que NO hice, a propósito

- **No puse `test-integration` en verde.** El fallo es un defecto de producción (PT-142). Ponerlo
  verde aquí sería el fracaso de este PT, no su éxito.
- **No usé `--runInBand`** para esconder la carrera. Habría hecho verde una suite que sigue sin poder
  correr en paralelo.
- **No marqué ningún job `continue-on-error`.**
- **No reorganicé los `needs`.** Fuera de alcance (§ out-of-scope 2), aunque esta corrida enseña su
  coste: `lint` rojo dejó cuatro jobs sin ejecutar.
- **No toqué `HISTORY.log`, `evidence/` ni `archive/`** al corregir «siete jobs → ocho»: son registro
  inmutable y dicen lo que se sabía entonces.

## Lista de STATE 5

- [x] Criterios de aceptación verificados — **y los dos incumplidos, declarados**
- [x] Escenarios del paquete de propuesta, pasando (los que este PT cubre)
- [x] Sin efectos colaterales: 702/702, `lint` 0 errores
- [x] `11-Conventions.md` respetado; **RULE-16** añadida
- [x] Commits atómicos, trazables a PT-136
- [x] Sin `console.log` ni código comentado
- [x] Documentación actualizada: `CLAUDE.md`, `11-Conventions.md`, `HANDOFF.md`, `PENDING_TASKS.md`,
      `10-Technical-Debt.md`

## F-136-A — Documentos que citan evidencia que no está en el repositorio

Encontrado al guardar esta misma evidencia, que es la mejor forma de encontrarlo.

`.gitignore:161-163` versiona los `.md` de evidencia y **excluye los volcados**, con su razón escrita:
*«los .md son razonamiento, el resto son volcados»*. La política es defendible.

Lo que no lo es: **hay documentos que mandan leer esos volcados.**

```
docs/implementation/evidence/  ->  162 ficheros en disco
                                    83 seguidos por git
                                    79 que solo existen en una maquina
```

| Documento | Manda leer | ¿Está en el repositorio? |
|---|---|---|
| `PENDING_TASKS.md:58` | `evidence/PT-135/regresion.txt` | **No** |
| `HISTORY.log` (6 citas) | `fase-32-corrida-completa.txt`, `fases-70-71.txt`, `guarda-caza-la-regresion.txt`, `npm-test.txt`, `regresion.txt`, `vieja-falla-nueva-pasa.txt` | **No** |

`PENDING_TASKS.md:58` es una **guía de validación**: le dice al humano qué leer antes de dar el VoBo a
PT-135, y la mitad de lo que nombra no está. Es la forma exacta de H-016 — una cita que se lee como
verificable y no se puede seguir.

**No lo corrijo aquí**: son dos vías (que los volcados citados se versionen, o que lo citable se
resuma en un `.md`) y elegir es una decisión de política, como lo fue ADR-048 con los locks. Lo que sí
hago es **no repetirlo**: la evidencia de PT-136 va en `.md`.

## Lo que falta para cerrar PT-136

1. **PT-142** — la carrera de `SystemConfigService`. Sin ella, `build` y `docker` no se ejecutan.
2. **Una corrida disparada por un push real a `master`**, no por `workflow_dispatch`.
3. **El VoBo humano.** Es un BUG: el agente no cierra bugs.

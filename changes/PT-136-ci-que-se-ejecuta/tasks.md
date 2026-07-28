# PT-136 — Tareas atómicas

**Prerequisito**: ninguno sobre otro PT. Requiere `gh` autenticado (verificado: `a81Biz`, oauth).
Ninguna empieza antes del ACK del Proposal Gate.
**Regla que gobierna todas**: ningún job se silencia para que la corrida se vea verde.

---

## PT-136.1 — RED: la guarda de las ramas del disparador

- **Objetivo**: una prueba que falle **hoy**, con el `ci.yml` que está en `master`.
- **Entrada**: `.github/workflows/ci.yml`; patrón de `healthcheck-apunta-a-ruta-real.spec.ts`
  (`test/unit/despliegue/`), que es la guarda hermana en familia y ubicación.
- **Salida**: `src/api/test/unit/despliegue/ramas-del-disparador-existen.spec.ts`. Parsea el `on:` de
  **cada** fichero de `.github/workflows/`, extrae toda rama nombrada en `branches:` y exige que
  exista en el remoto. Si no puede resolver el remoto, **falla**; nunca se salta.
- **Validación**: falla contra `master`, nombrando `dev`, `qa`, `prep` y `prod` como inexistentes.
- **Status**: PENDING

## PT-136.2 — GREEN: el disparador contra la realidad

- **Objetivo**: que el workflow pueda ejecutarse.
- **Entrada**: D1 y D2 de `design.md`.
- **Salida**: `.github/workflows/ci.yml` — `push`/`pull_request` a `master`, más `workflow_dispatch`.
  Retiradas las cuatro ramas inexistentes.
- **Validación**: PT-136.1 **en verde**. `gh workflow view CI` muestra el disparador nuevo.
- **Status**: PENDING

## PT-136.3 — Casos de control: la guarda sabe fallar

- **Objetivo**: RULE-14. Una guarda que nadie ha visto fallar no es una guarda.
- **Entrada**: la guarda de D1.
- **Salida**: al menos tres casos de control — (a) un workflow ficticio con una rama inexistente
  **debe** fallar; (b) uno con `master` **debe** pasar; (c) un `on:` sin `branches:` (sólo
  `workflow_dispatch`) **debe** pasar, no reventar.
- **Validación**: los tres, en los dos sentidos.
- **Status**: PENDING

## PT-136.4 — El estreno controlado: `workflow_dispatch`, mirando

- **Objetivo**: ver los ocho jobs por primera vez sin que un push los dispare de espaldas.
- **Entrada**: PT-136.2 fusionado a la rama del PT y empujado.
- **Salida**: `gh workflow run CI --ref <rama>` y la corrida completa capturada job a job.
- **Validación**: los ocho jobs **arrancan**. Que terminen en verde no es criterio de esta tarea; que
  se ejecuten, sí.
- **Status**: PENDING

## PT-136.5 — Triaje de lo que salga rojo

- **Objetivo**: clasificar cada fallo según D3, **antes** de tocar nada.
- **Entrada**: la salida de PT-136.4.
- **Salida**: una tabla `job | fallo | clase | destino`, donde clase ∈ {defecto del job, defecto del
  repositorio, test viejo}. Los de la primera clase se corrigen aquí; los otros dos abren PT con su
  entrada en `DISCOVERY.md`.
- **Validación**: ninguna fila sin clase. Ningún fallo «resuelto» con `continue-on-error`.
- **Status**: PENDING

## PT-136.6 — Corregir los defectos del job (y sólo esos)

- **Objetivo**: que los ocho jobs terminen, con el resultado que la realidad les dé.
- **Entrada**: las filas de clase «defecto del job» de PT-136.5.
- **Salida**: `ci.yml` corregido. Un commit por defecto corregido.
- **Validación**: nueva corrida por `workflow_dispatch`; los defectos de esa clase, cerrados.
- **Status**: PENDING

## PT-136.7 — Los tres checkpoints, con ejecución real por fin

- **Objetivo**: la razón de ser de este PT. `schema-drift`, `security-audit` y `observabilidad` tienen
  su primera ejecución real en CI.
- **Entrada**: la corrida de PT-136.6.
- **Salida**: log de los tres jobs, capturado como evidencia.
- **Validación**: los tres corren y emiten veredicto. **Un `SIN_DATOS` cuenta como fallo**, no como
  aprobado — y si aparece, es el hallazgo que PT-138 predice.
- **Status**: PENDING

## PT-136.8 — La cuenta de jobs, corregida donde está mal

- **Objetivo**: son ocho, no siete.
- **Entrada**: `HANDOFF.md:50`, `PENDING_TASKS.md:32`, y cualquier otro sitio que diga «siete».
- **Salida**: los documentos corregidos, con la lista de los ocho nombres.
- **Validación**: `grep -rn "siete jobs"` sin resultados en `docs/`.
- **Status**: PENDING

## PT-136.9 — El push real, y el criterio 10 de PT-135

- **Objetivo**: cerrar lo único que quedaba abierto de PT-135.
- **Entrada**: la rama fusionada a `master`.
- **Salida**: corrida disparada **por el push**, no a mano. `gh run list` deja de estar vacío.
- **Validación**: la corrida existe, con su `head_sha` igual al commit de merge. Es la primera vez que
  el lock de PT-135 gobierna de verdad en CI (`npm ci`).
- **Status**: PENDING

## PT-136.10 — Regresión completa

- **Objetivo**: no haber roto nada al arreglar el vigilante.
- **Entrada**: la suite entera.
- **Salida**: 944 unitarias · 77 e2e · 176 por navegador, más la guarda nueva.
- **Validación**: sin pérdidas respecto a la línea de `HANDOFF.md`.
- **Status**: PENDING

## PT-136.11 — Evidencia y self-review

- **Objetivo**: STATE 5. Ejecución, no código.
- **Salida**: `docs/implementation/evidence/PT-136/` — salida de `gh run list` antes (vacía) y después,
  log de los tres checkpoints, tabla de triaje, `regresion.txt`, `self-review.md`.
- **Validación**: la lista de STATE 5 completa.
- **Status**: PENDING

## PT-136.12 — Historia y handoff

- **Objetivo**: STATE 7, **la segunda escritura**.
- **Salida**: entrada en `HISTORY.log` (append) y `HANDOFF.md` reescrito. Si el triaje abrió PT, van
  registrados con su `DISCOVERY.md`.
- **Validación**: `coherencia-deuda-tecnica.spec.ts` y la guarda documental, en verde.
- **Status**: PENDING

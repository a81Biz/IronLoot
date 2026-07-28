# PT-138 — Tareas atómicas

**Prerequisito**: PT-136 cerrado.
Ninguna empieza antes del ACK del Proposal Gate.
**Aviso**: `docker compose down -v` **borra la base de datos**. Para recrear sólo el `node_modules`
de un servicio: `docker compose rm -fsv api`.

---

## PT-138.1 — RED: las ocho guardas fallando dentro del contenedor, medido

- **Objetivo**: la línea base del defecto, capturada. No basta con saberlo: hay que poder enseñarlo.
- **Entrada**: entorno levantado.
- **Salida**: salida de `docker exec ironloot-api npx jest` para las ocho, con su `ENOENT` y su
  `Tests: 0 total`.
- **Validación**: 8 de 8 fallan dentro; 8 de 8 pasan en el host. **La asimetría es el defecto.**
- **Status**: PENDING

## PT-138.2 — RED: `SIN_DATOS` devolviendo cero

- **Objetivo**: demostrar que hoy un checkpoint que no pudo medir dice `OK`.
- **Entrada**: `docker exec ironloot-api npm run audit:observability; echo $?`
- **Salida**: capturado — `trace_completeness = SIN_DATOS`, `OK — sin silencios nuevos`, **exit 0**.
- **Validación**: es el RED de D3. Y es el hallazgo más grave de este PT.
- **Status**: PENDING

## PT-138.3 — GREEN: `SIN_DATOS` sale distinto de cero

- **Objetivo**: unificar con la regla que `audit:schema` ya aplica.
- **Entrada**: `src/api/scripts/observability-check.ts`; el patrón de mensaje de
  `schema-drift-check.ts` (*«un error de ejecución no es un aprobado»*).
- **Salida**: el script falla cuando no pudo medir, con mensaje que diga **qué** no pudo medir.
- **Validación**: PT-138.2 en verde (ahora falla como debe).
- **Status**: PENDING

## PT-138.4 — `observability-check.ts` habla con la base, no con docker

- **Objetivo**: D2. Un script que invoca `docker exec` no puede correr donde RULE-15 manda.
- **Entrada**: `DATABASE_URL`, como el resto del repositorio.
- **Salida**: el script sin dependencia del CLI de docker.
- **Validación**: `trace_completeness` da **número real** dentro del contenedor. Mismo valor que desde
  el host — si difieren, hay un segundo defecto y se investiga antes de seguir.
- **Status**: PENDING

## PT-138.5 — La raíz montada en el servicio `api`

- **Objetivo**: D1.
- **Entrada**: `docker-compose.yml`, servicio `api`. Punto de montaje **distinto** de los existentes
  (p. ej. `/repo`, sólo lectura). No se reorganiza lo que ya funciona.
- **Salida**: el compose con el volumen nuevo; `RAIZ` resuelta al punto correcto en los tres sitios
  (host, contenedor, CI).
- **Validación**: las ocho guardas **pasan dentro del contenedor**. Y `security-baseline.json` está
  presente sin excepción por fichero.
- **Status**: PENDING

## PT-138.6 — El arranque, intacto

- **Objetivo**: R4. Montar la raíz no puede alterar lo que ya funciona.
- **Entrada**: `docker compose up -d` con volumen limpio de `node_modules`
  (`docker compose rm -fsv api`), **no** `down -v`.
- **Salida**: los ocho contenedores `healthy`; recarga en caliente tras editar un fichero de `src/`.
- **Validación**: ciclo completo levantar → `healthy` → editar → recargar. **Sin esto no se sigue.**
- **Status**: PENDING

## PT-138.7 — `audit:check` encuentra su línea base dentro

- **Objetivo**: el tercer síntoma.
- **Entrada**: PT-138.5.
- **Salida**: `docker exec ironloot-api npm run audit:check` con veredicto real contra
  `security-baseline.json`.
- **Validación**: ya no dice «No hay línea base».
- **Status**: PENDING

## PT-138.8 — Los tres sitios, la misma respuesta

- **Objetivo**: el criterio que resume el PT.
- **Entrada**: las ocho guardas y los tres checkpoints.
- **Salida**: tabla `prueba | host | contenedor | CI` con el veredicto de cada celda.
- **Validación**: **ninguna celda con resultado distinto por el sitio donde se ejecutó.** Una guarda
  que depende de dónde se corre no es una guarda.
- **Status**: PENDING

## PT-138.9 — La vía del contenedor desechable, documentada

- **Objetivo**: D4. Funciona, se usó en PT-135, nadie la adivina.
- **Salida**: `CLAUDE.md` con la invocación completa y **cuándo usarla** (contenedor limpio), dejando
  claro que la vía normal es `docker exec`.
- **Validación**: alguien que no estuvo en PT-135 puede ejecutarla leyendo sólo el documento.
- **Status**: PENDING

## PT-138.10 — Casos de control

- **Objetivo**: RULE-14 sobre lo que este PT toca.
- **Salida**: (a) checkpoint que no puede medir → **sale distinto de cero**; (b) checkpoint que mide y
  está bien → 0; (c) checkpoint que mide y está mal → distinto de cero **con otro mensaje**.
- **Validación**: los tres. (a) y (c) no pueden confundirse: «no pude medir» y «medí y está mal» son
  cosas distintas y deben leerse distinto.
- **Status**: PENDING

## PT-138.11 — Regresión, evidencia, registro

- **Salida**: 944 · 77 · 176 · `evidence/PT-138/` con la tabla de los tres sitios y el antes/después
  del `SIN_DATOS` · `HISTORY.log` + `HANDOFF.md` · **F-135-B cerrado**.
- **Validación**: STATE 5 completo. BUG → `VALIDATION_PENDING`.
- **Status**: PENDING

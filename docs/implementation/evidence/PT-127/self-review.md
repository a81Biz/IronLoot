# PT-127 — Self-Review (STATE 5)

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-127-migraciones-reproducibles` · **Origen**: PTSA H-014

---

## Lista de comprobación FDGE

- [x] **¿Todos los criterios de éxito del plan verificados?** Los ocho, uno a uno:

  | # | Criterio | Resultado |
  |---|---|---|
  | 1 | `migrate deploy` sobre base vacía → esquema idéntico | `All migrations have been successfully applied` |
  | 2 | `migrate diff --exit-code` → 0 diferencias | `No difference detected` · EXIT 0 |
  | 3 | Las cuatro sondas del cliente Prisma | **4 de 4** (antes 1 de 4) |
  | 4 | `payments.reference` UNIQUE en la base de migraciones | `payments_reference_key ... UNIQUE (reference)` |
  | 5 | `migrate status` sobre `ironloot_db` sin pendientes | `Database schema is up to date!` |
  | 6 | Datos de auditoría intactos | wallets 4 · ledger 15 · payments 1 · bids 3 — **idéntico** |
  | 7 | 603 API + 134 CORE + typecheck | **610** API (603+7 nuevos) · 134 CORE · typecheck limpio |
  | 8 | El control falla y pasa, probado | Sí — `control-en-los-dos-sentidos.txt` |

- [x] **¿Todos los escenarios del Proposal Package pasando?** E1–E5, C1–C3, B1–B3. Detalle abajo.

- [x] **¿Sin efectos colaterales no buscados?** Los cinco checkpoints de auditoría verdes tras el
      cambio: `audit:schema` OK · `audit:check` OK · `audit:domain` rubric 100 · `audit:observability`
      trace 100 % y 25 silencios (línea base) · `audit:reliability` verde. Los ocho contenedores
      `healthy`. `/api/v1/health` → 200.

- [x] **¿Convenciones de `11-Conventions.md` respetadas?** El control copia el patrón de PT-118:
      función pura exportada (`interpretar`) probada con datos sintéticos, y el I/O en `main()`. Job
      de CI sin `needs`, como `security-audit`. Comentario de cabecera explicando las dos decisiones
      no obvias, como el resto de guardas del repositorio.

- [x] **¿Commits atómicos, con convención, trazables a PT-127?** Cuatro:
      `fix:` migración · `fix:` entrypoint · `feat:` control · `docs:` registro.

- [x] **¿Sin artefactos de depuración?** El campo `campoDeControlPT127` del caso de control quedó
      revertido: `grep -c` → 0, y `git status` sobre `schema.prisma` limpio. Bases de prueba
      (`pt127_shadow`, `pt127_verify`, `ironloot_db_shadow_check`) eliminadas al cierre.

- [x] **¿Documentación actualizada si cambió el API público?** El API HTTP no cambió. Sí cambió un
      **contrato operativo**, y está documentado en el propio `entrypoint.dev.sh` y en
      `spec-changes.md`: editar `schema.prisma` ya exige generar migración.

---

## Delta real vs planificado

**Tres desviaciones. Ninguna oculta.**

### 1. La prueba RED y el control se comitearon juntos

`tasks.md` preveía un commit `test:` separado en RED. Se descartó: ese commit **no compilaría**
—el import apunta a un fichero que aún no existe—, y un commit que no compila rompe `git bisect` y
dejaría CI rojo en ese punto del historial.

La disciplina tests-first se cumplió y está evidenciada: `red-antes-del-control.txt` guarda la
corrida en RED con su error `TS2307`, anterior a escribir el script.

### 2. Hizo falta reconstruir la imagen, y no estaba previsto

`src/api/scripts/` **no está montado como volumen** en `docker-compose.yml` — sólo lo están `src/`,
`prisma/`, `test/` y cuatro ficheros sueltos. El cambio del entrypoint no surtía efecto al
reiniciar: seguía corriendo `db push` desde la imagen.

Se detectó porque el log del arranque decía `The database is already in sync with the Prisma
schema`, que es el mensaje de `db push`, no de `migrate deploy`. **Si me hubiera fiado del fichero
en vez de leer el log, habría cerrado el PT afirmando algo falso** — que es exactamente el defecto
que este PT viene a cerrar.

Corregido con `docker-compose build api`. Verificado después:
`Applying database schema (migrations)... / 1 migration found / No pending migrations to apply.`

**Consecuencia que se registra**: cualquier cambio futuro en `src/api/scripts/` exige reconstruir la
imagen para probarlo. Los `audit:*` que corren dentro del contenedor usan la copia de la imagen —
por eso `npm run audit:schema` falló dentro del contenedor y funciona desde el host, que es como lo
corre CI.

### 3. Se ejecutó la vía B, no la A

Prevista como decisión abierta del Proposal Gate y **resuelta con evidencia** antes de empezar:
un solo autor en todo el historial, `master` == `origin/master`, y ninguna de las 57 ramas contiene
las migraciones que faltaban. No había historial que conservar.

---

## Escenarios del Proposal Package

| ID | Escenario | Resultado |
|---|---|---|
| E1 | Las migraciones reproducen el esquema | ✅ `No difference detected`, EXIT 0 |
| E2 | La aplicación funciona contra ese esquema | ✅ 4 de 4 sondas |
| E3 | `payments.reference` UNIQUE en el artefacto | ✅ `payments_reference_key` |
| E4 | La base de desarrollo con historial | ✅ `Database schema is up to date!` |
| E5 | El contenedor arranca aplicando migraciones | ✅ tras reconstruir; health 200 |
| C1 | El control detecta un cambio sin migración | ✅ FALLA, nombra la columna, dice qué hacer |
| C2 | El control acepta el cambio revertido | ✅ PASA |
| C3 | Un fallo de migración detiene el arranque | ⚠️ **no ejecutado** — ver abajo |
| B1 | `migrate deploy` sobre base poblada → P3005 | ✅ observado en S-002, motivo del baseline |
| B2 | Baseline sobre base con datos | ✅ recuento idéntico, cero filas modificadas |
| B3 | Segunda ejecución de `deploy` → no-op | ✅ `No pending migrations to apply` |

### C3 no se ejecutó, y se dice

Exigía introducir SQL inválido en la migración y reiniciar el contenedor para comprobar que el
arranque se detiene. **No se hizo**: la única migración que existe ahora es la inicial completa, y
corromperla para una prueba, con la base de desarrollo ya baselineada contra ella, arriesgaba el
dato real que sostiene la validación de 11 productos PTSA — el riesgo R2 del plan, clasificado
CRÍTICO.

Lo que sí está demostrado por construcción: el `||` que se tragaba el error **ya no existe**
(`git diff` de `entrypoint.dev.sh`), y `migrate deploy` sin respaldo propaga su código de salida con
`set -e` activo en la línea 5 del script.

**Es una comprobación pendiente, no una comprobación aprobada.** Queda registrada como tal.

---

## Lo que este PT NO resuelve

- **H-015** (job de CI) y **H-017** (imagen de producción) — PT-128 y PT-129. El `migrate deploy`
  que PT-128 necesita ya está listo.
- Que `ironloot_db` sea a la vez base de desarrollo y dato de auditoría. Riesgo estructural, anotado
  en `HANDOFF.md`.
- El aviso de `path-to-regexp` sobre `"/api/*"` que aparece en el arranque. **Es de PT-126
  (Express 5), no de este PT**; Express lo auto-convierte a `/api/{*path}` y la aplicación funciona.
  Se registra como observación, sin tocarlo.

---

## Estado

**`VALIDATION_PENDING`.** H-014 es tipo BUG: `[R44]` prohíbe al agente cerrarlo. Pasa a `CORREGIDA`
y espera validación humana.

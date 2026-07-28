# PT-127 — Design: migraciones que reproducen el esquema, y un control que lo mantiene

**Tipo**: BUG · **Complejidad**: MAJOR · **Origen**: PTSA **H-014** (CRITICA, D2) · Evidencia **E-017**
**Fuentes**: `DISCOVERY.md` § PT-127 · `CONTEXT_ANALYSIS.md` § PT-127 · `PLAN_ACTUAL.md` ·
`changes/PT-037-migration-reconciliation/` · `HISTORY.log` (PT-037, PT-117, PT-118) ·
`07-Database-Architecture.md` · Graphify.
**Prerequisito de ejecución**: PostgreSQL 16 para base sombra — **disponible** (`ironloot-db`).

---

## El problema en una frase

Las 23 migraciones son el único artefacto capaz de construir el esquema en otro entorno, **nunca se
han ejecutado**, y no producen el esquema que la aplicación necesita.

## Lo que este PT tiene que conseguir, y que PT-037 no consiguió

PT-037 hizo esto mismo el 23-jul y el drift volvió en cuatro días. Su `design.md` § D5 dejó la
prevención en una nota documental —«documentar que `db push` es solo para prototipado»— y su
`out-of-scope` dijo «No se elimina el script en este PT».

**La diferencia de este PT es la decisión D4.** Sin un control ejecutable, esto vuelve una tercera
vez.

---

## Decisiones

### D1 — La vía: reconciliar (A) o colapsar (B) · **RESUELTA: vía B**

> **Resuelta el 2026-07-27.** El humano confirmó que sólo se ha trabajado en esta máquina, y se
> verificó:
>
> ```
> git log --all --format="%an <%ae>" | sort -u   ->  un unico autor
> git rev-parse master origin/master             ->  328b421 == 328b421
> ```
>
> Un solo autor, `master` local idéntico a `origin/master`, y `_prisma_migrations` inexistente en la
> única base que existe. **No hay ningún entorno donde las 23 migraciones se hayan aplicado**, así
> que el riesgo R5 —romper un entorno de terceros— no existe.
>
> **Se ejecuta la vía B: colapsar en una migración inicial.** Ejecutar `PT-127.3 [B]`; `PT-127.3 [A]`
> queda descartada.
>
> Además, se comprobó sobre **todo** el historial —57 ramas, no sólo `master`— que las migraciones
> que faltan no existen en ninguna parte:
>
> ```
> git grep -l "AUCTION_SOLD"          $(git rev-list --all) -- 'src/api/prisma/migrations/*'  -> vacio
> git grep -l "account_verifications" $(git rev-list --all) -- 'src/api/prisma/migrations/*'  -> vacio
> ```
>
> No hay una rama sin fusionar que las traiga. El drift es real y completo.

El análisis original de ambas vías se conserva abajo, porque justifica la elección.

**Vía A — reconciliar conservando el historial**

Una migración nueva generada por `migrate diff --from-migrations --to-schema-datamodel`, más
baseline de las 24 sobre la base existente. Es el procedimiento de PT-037, ya recorrido en este
repositorio.

- ✅ Conserva las 23 carpetas.
- ✅ Procedimiento probado aquí.
- ❌ Conserva un historial que **nunca se ha ejecutado en ningún sitio** y que está demostrado que
  no produce el esquema actual.
- ❌ La verificación es en dos pasos (aplicar 23 + la nueva, y comparar).

**Vía B — colapsar en una migración inicial**

Retirar las 23 carpetas, generar **una** migración desde `schema.prisma` (`migrate diff
--from-empty --to-schema-datamodel`), baselinear la base existente contra ella.

- ✅ El artefacto pasa a ser verificable **en un paso**: `deploy` sobre base vacía, `diff` = 0.
- ✅ No conserva ficción: git guarda la historia de los ficheros; `migrations/` es artefacto de
  despliegue, no registro histórico.
- ✅ Elimina de raíz el drift acumulado desde PT-037 (4 divergencias) sin ir caso por caso.
- ❌ **Rompe cualquier entorno que sí tenga `_prisma_migrations` poblado** con las 23.

**Criterio de decisión — una sola pregunta:**

> ¿Existe algún entorno (staging, una copia, la máquina de alguien) donde las 23 migraciones se
> hayan aplicado alguna vez?

- **Sí** → **vía A**, obligatoria.
- **No** → **vía B**, recomendada.

**Todo lo observado apunta a que no existe**: `_prisma_migrations` no está en la única base
accesible, `ci.yml` no tiene job de despliegue, el `Dockerfile` de producción no aplica esquema, y
la línea de `HISTORY.log` de PT-037 dice que el baseline quedó pendiente. Pero es información que
el auditor **no puede obtener por observación** de este entorno, y equivocarse aquí rompe un
entorno de terceros.

**Recomendación: vía B.** El resto del diseño está escrito para funcionar con cualquiera de las
dos; las tareas afectadas están marcadas.

### D2 — El SQL se genera, nunca se escribe

Es la decisión D1 de PT-037 y la razón por la que funcionó: el DDL sale de `schema.prisma`, que es
la fuente de verdad declarada. Escribirlo a mano reintroduce el riesgo que el PT viene a cerrar.

```
prisma migrate diff --from-migrations prisma/migrations \
                    --to-schema-datamodel prisma/schema.prisma \
                    --shadow-database-url $SHADOW --script      # via A
prisma migrate diff --from-empty \
                    --to-schema-datamodel prisma/schema.prisma --script   # via B
```

### D3 — El punto de aplicación deja de ser `db push`

`entrypoint.dev.sh:52-55` hoy:

```bash
npx prisma db push --accept-data-loss 2>&1 || {
  echo "⚠️ db push failed, trying migrate deploy..."
  npx prisma migrate deploy 2>&1 || echo "⚠️ migrate also failed"
}
```

Pasa a:

```bash
npx prisma migrate deploy      # y si falla, el arranque falla
```

**Con el respaldo invertido, a propósito.** Hoy `db push` es el camino principal y `migrate deploy`
el respaldo que nunca corre; y el segundo `||` se traga el error con un `echo`. El resultado es un
arranque que **siempre parece exitoso**. Después: si `migrate deploy` falla, el contenedor no
arranca y se ve.

`--accept-data-loss` desaparece. No se observó pérdida de datos, pero es una bandera destructiva
ejecutándose sola en cada arranque.

> **Nota para quien revise**: esto cambia la experiencia diaria. Un desarrollador que edite
> `schema.prisma` y reinicie ya **no** verá su cambio aplicado solo: tendrá que generar migración
> con `npm run db:migrate` (`prisma migrate dev`). Es el coste, y es el objetivo.

### D4 — El control que impide la recurrencia · **es lo que hace que este PT no sea PT-037 otra vez**

Script nuevo `src/api/scripts/schema-drift-check.ts`, expuesto como `npm run audit:schema`, que
falla si las migraciones y `schema.prisma` divergen:

```
prisma migrate diff --from-migrations prisma/migrations \
                    --to-schema-datamodel prisma/schema.prisma \
                    --shadow-database-url $SHADOW --exit-code
# exit 0 = sin diferencias · exit 2 = hay diferencias
```

Corre en CI, en un job propio y **sin `needs`**, igual que `security-audit` de PT-118 — para que no
lo pueda bloquear un job roto, que es precisamente lo que le pasó a todo lo demás (H-015).

Se sigue el criterio que PT-118 dejó escrito: **falla contra un estado esperado, no contra un
umbral cosmético**. Aquí el estado esperado es «cero diferencias», que es binario y no admite
línea base.

### D5 — Los datos de la auditoría se copian antes de tocar nada

`ironloot_db` contiene la salida real sobre la que PTSA validó 11 de 12 productos. `pg_dump` antes
de la primera operación, y recuento de control después:

```
wallets 4 · ledger 15 · payments 1 · bids 3 · payment_cycle_events 49
```

`migrate resolve --applied` **no ejecuta SQL**: es la operación segura para la base existente. El
SQL sólo se ejecuta sobre bases sombra desechables.

### D6 — Alcance de auditoría: ya ampliado

S-002 añadió `src/api/scripts/**` a `auditable_patterns` de `audit-scope.yaml`. `entrypoint.dev.sh`
—la causa directa— estaba fuera del alcance y por eso sobrevivió nueve sesiones. No hay trabajo
adicional aquí; se registra para trazabilidad.

---

## Alternativas descartadas

**Sólo baselinear, sin migración de reconciliación.** Dejaría `migrate status` limpio y las
migraciones divergiendo para siempre. Arregla lo que se mira, no lo que falla.

**Prohibir `db push` por documentación.** Es lo que hizo PT-037 (§ D5) y falló en cuatro días. Una
regla que sólo vive en un documento no es un control.

**Escribir el SQL a mano.** Reintroduce exactamente el riesgo que el PT cierra.

**Endurecer el SQL a idempotente** (la decisión D2 de PT-037). PT-037 la sustituyó a mitad de
camino por «migración estándar + baseline» tras su spike, y lo dejó escrito en su delta. No se
repite un camino que su propio autor abandonó.

---

## Componentes tocados

| Fichero | Cambio |
|---|---|
| `src/api/prisma/migrations/<ts>_<nombre>/migration.sql` | **nuevo** (A: reconciliación · B: inicial única) |
| `src/api/prisma/migrations/` (23 carpetas) | **sólo en vía B**: se retiran |
| `src/api/scripts/entrypoint.dev.sh` | `db push` → `migrate deploy`, sin respaldo silencioso |
| `src/api/scripts/schema-drift-check.ts` | **nuevo** — el control D4 |
| `src/api/package.json` | script `audit:schema` |
| `.github/workflows/ci.yml` | job `schema-drift`, sin `needs` |
| `src/api/prisma/schema.prisma` | **sin cambios** — es el objetivo |

---

## Procedimiento de verificación (STATE 4-5)

1. `pg_dump` de `ironloot_db`.
2. Base sombra limpia → `migrate deploy` → `migrate diff --from-schema-datamodel
   --to-schema-datasource --exit-code` = **0**.
3. Las cuatro sondas del cliente Prisma contra esa base sombra: **4 de 4 OK** (hoy 1 de 4).
4. `payments_reference_key` **UNIQUE** en la base sombra.
5. Baseline de `ironloot_db` → `migrate status` sin pendientes.
6. Recuento de datos: idéntico al de control.
7. Reiniciar `ironloot-api`: arranca con `migrate deploy`.
8. 603 tests + 134 de CORE + `typecheck` + los cuatro checkpoints de auditoría.
9. **El control D4 en los dos sentidos**: añadir un campo a `schema.prisma` sin migración → falla;
   generar la migración → pasa; revertir.

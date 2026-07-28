# PT-138 — Cambios de especificación

## `docker-compose.yml` — servicio `api`

Se añade un volumen con la raíz del monorepo, en un punto **distinto** de los existentes y en sólo
lectura:

```yaml
    volumes:
      - ./src/api/src:/app/src
      - ./src/api/test:/app/test
      - ./src/api/prisma:/app/prisma
      - ./src/packages/core:/packages/core
      - .:/repo:ro          # PT-138: las guardas leen el arbol del monorepo
      - /app/node_modules
```

**No se reorganizan los montajes que ya funcionan.** PT-135 declaró `docker-compose.yml` sin cambios
de comportamiento; **este PT levanta esa restricción con su razón escrita**, y la acota a añadir un
punto de sólo lectura.

## `src/api/scripts/observability-check.ts`

| Antes | Después |
|---|---|
| Consulta la BD invocando `docker exec ironloot-db psql` | Consulta por `DATABASE_URL`, como el resto del repositorio |
| `SIN_DATOS` → imprime `OK — sin silencios nuevos`, **exit 0** | `SIN_DATOS` → **falla**, exit ≠ 0, nombrando qué no pudo medir |

El mensaje se alinea con el que `schema-drift-check.ts` ya usa:

> `FALLA — No se pudo comprobar […]. Un error de ejecucion no es un aprobado`

## `CLAUDE.md`

**§ Checkpoints de auditoría** — se corrige la afirmación implícita de que los tres de CI se pueden
ejecutar en cualquier sitio, y se añade:

> Los checkpoints y las guardas que leen el árbol del monorepo **se ejecutan dentro del contenedor**,
> que es donde RULE-15 dice que vive npm. Hasta PT-138 no podían: `docker-compose` no montaba la raíz
> y ocho guardas fallaban con `ENOENT` y **0 pruebas ejecutadas**, mientras `audit:observability`
> devolvía `SIN_DATOS` y a continuación decía `OK`. **Un checkpoint que no pudo medir sale distinto de
> cero** — la regla que `audit:schema` ya aplicaba y la métrica de al lado no.

**§ Hybrid Local Dev** — se documenta la vía del contenedor desechable, con cuándo usarla:

```bash
# Vía normal: sobre el servicio ya levantado
docker exec ironloot-api npx jest --testPathPattern="<patron>" --no-coverage

# Contenedor limpio (p. ej. para verificar una instalación desde cero, como en PT-135)
docker run --rm -v "$PWD":/repo -v <volumen_node_modules>:/repo/src/api/node_modules \
  -w /repo/src/api node:20-slim npx jest --testPathPattern="<patron>" --no-coverage
```

## Nueva regla de convenciones

`11-Conventions.md` — **RULE-18**:

> **Un control que no pudo medir sale distinto de cero, y con un mensaje distinto del de «medí y está
> mal».**
> `audit:observability` devolvía `trace_completeness = SIN_DATOS` y a continuación `OK — sin silencios
> nuevos` (PT-138). Es la misma trampa que PT-122 evitó al reclasificar `audit:domain` y
> `audit:reliability` como métricas de delta sync: *en CI la base nace vacía y devolverían `SIN_DATOS`
> siempre, que alguien acabaría leyendo como verde*.
> Corolario: **toda guarda tiene que dar el mismo veredicto en el host, en el contenedor y en CI.**
> Una que depende de dónde se corre no es una guarda.

## Registros

- `PENDING_TASKS.md` — **F-135-B** deja de figurar «sin PT asignado».
- `HANDOFF.md` — § *Lo que hay que saber antes de tocar nada*: se añade la vía de ejecución de guardas.

## Lo que este PT NO especifica

- Cómo resuelven `RAIZ` los ocho ficheros, más allá de lo mínimo para los tres sitios.
- Qué mide el checkpoint D3. Cambia de dónde saca el dato y cómo se comporta sin él, no su contenido.

# PT-128 — Cambios de especificación

## API HTTP · Modelo de datos · Contratos de tipos · Eventos

**Ninguno.** Este PT no toca código de aplicación salvo que el diagnóstico de manejadores abiertos
(PT-128.1) señale una conexión que la aplicación no cierra. Si eso ocurre, el cambio es de
**teardown de pruebas**, no de contrato.

---

## Contrato del pipeline — aquí está todo el cambio

### `test-integration`, antes y después

| | Antes | Después |
|---|---|---|
| Cliente Prisma | no se genera | `prisma generate` explícito |
| Esquema de la base | **ninguno** | `prisma migrate deploy` |
| Ejecución | `npm run test:e2e -- --passWithNoTests` | igual, pero sobre una base utilizable |
| Terminación | **no termina** | termina sola (o con `--forceExit` documentado) |
| Resultado | nunca verde | verde, y rojo cuando algo se rompe |

### Grafo de jobs

```
antes:  lint ─┬─ test-unit ────────┐
              └─ test-integration ─┴─ build ── docker     [bloqueado: test-integration nunca acaba]
              (security-audit, independiente)

despues: mismo grafo, recorrido entero
         + schema-drift (de PT-127, sin needs)
         + observabilidad (D3)
```

`build` y `docker` pasan de **nunca ejecutarse** a ejecutarse. No es un cambio de configuración: es
la primera vez que el pipeline produce artefacto.

### Efecto lateral buscado

Con `migrate deploy` en el job, **cada push comprueba que las migraciones de PT-127 siguen
reproduciendo el esquema.** No hace falta un control aparte para eso: sale gratis del arreglo.

---

## Checkpoints de auditoría — reclasificación

`PTSA/audit-scope.yaml` § `ci_checkpoints`:

| Checkpoint | Antes | Después | Motivo |
|---|---|---|---|
| `D2` dependencias | corre (PT-118) | igual | — |
| `D2` esquema | «typecheck + prisma», vago | `audit:schema` (PT-127) | Deja de ser una declaración |
| `D3` observabilidad | declarado desde PT-121, **sin job** | **corre en CI** | Su parte medible no necesita datos |
| `D1.N1` reglas de dominio | declarado desde PT-120, **sin job** | **métrica de delta sync**, documentado | En CI la base nace vacía: devolvería `SIN_DATOS` siempre y alguien lo leería como verde |

La última fila es un cambio de **clasificación**, no un incumplimiento. Es literalmente el
razonamiento que PT-122 dejó escrito al sacar D5 de `ci_checkpoints`. Se aplica el mismo criterio al
mismo problema en vez de añadir un job que dé un verde falso.

---

## `package.json`

Sólo si PT-128.1 lo obliga:

```diff
- "test:e2e": "jest --config ./test/jest-e2e.json"
+ "test:e2e": "jest --config ./test/jest-e2e.json --forceExit"
```

**Con comentario adjunto** que nombre el manejador y explique por qué no se puede cerrar. Sin esa
explicación, el cambio no entra: sería deuda disfrazada de configuración.

---

## Documentación que hay que actualizar

| Documento | Qué |
|---|---|
| `CLAUDE.md` § Development Commands | Que `test:e2e` exige base con esquema aplicado por migración |
| `PTSA/audit-scope.yaml` | Los checkpoints, según la tabla de arriba |

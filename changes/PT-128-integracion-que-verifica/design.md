# PT-128 — Design: que el job de integración pueda pasar, y que verifique algo

**Tipo**: BUG · **Complejidad**: STANDARD · **Origen**: PTSA **H-015** (ALTA, D2) · Evidencia **E-018**
**Fuentes**: `DISCOVERY.md` § PT-128 · `CONTEXT_ANALYSIS.md` § PT-128 · `PLAN_ACTUAL.md` ·
`HISTORY.log` (PT-118, PT-121) · `PTSA/audit-scope.yaml` § `ci_checkpoints`.
**Dependencia dura**: **PT-127 terminado.**

---

## El problema en una frase

Hay un job llamado «Integration Tests» que levanta una base sin esquema y ejecuta una suite que no
termina; `build` y `docker` cuelgan de él y por eso nunca se ejecutan.

## Dos fallos independientes

| | Qué | Cómo se midió |
|---|---|---|
| **F1** | La base llega **sin esquema**: ningún `migrate deploy`, ningún `db push`, ningún `prisma generate` | Lectura de `ci.yml:134-152` + reproducción: no termina, acaba matado por memoria |
| **F2** | La suite **no cierra sus manejadores**: no sale sin `--forceExit` | Con esquema completo, `auth` da 2 suites / 9 tests / 22.5 s, y Jest avisa de manejadores abiertos |

Arreglar sólo F1 deja el job colgado. Arreglar sólo F2 lo deja rojo. Hacen falta los dos.

---

## Decisiones

### D1 — El esquema se aplica con `migrate deploy`, nunca con `db push`

Es la decisión importante y no es de comodidad.

`db push` haría el job verde en un paso. Y sería **exactamente la trampa que causó H-014**: el
camino cómodo que aplica esquema sin dejar rastro ni verificar el artefacto desplegable.

Con `migrate deploy`, este job pasa a ser **la prueba continua de que PT-127 sigue funcionando**.
En cada push. Gratis. Si alguien vuelve a cambiar `schema.prisma` sin migración, aquí se ve.

Es también la razón de la dependencia dura: **si PT-127 no está terminado, este job no puede
pasar**, porque `migrate deploy` produce hoy un esquema sobre el que la aplicación falla.

### D2 — Los manejadores abiertos se diagnostican antes de decidir

`--forceExit` está a un carácter de distancia y es la respuesta equivocada por defecto. Si la fuga
es real —una conexión que la aplicación no cierra— no desaparece: reaparece en producción como
conexiones colgadas contra PostgreSQL o Redis.

**Orden obligatorio:**

1. `npx jest --config ./test/jest-e2e.json --detectOpenHandles --runInBand`
2. Leer qué reporta.
3. Cerrarlo donde esté.

Candidatos por inspección, sin confirmar todavía:

| Candidato | Por qué |
|---|---|
| `PrismaService` sin `$disconnect` | Si el `afterAll` no cierra el módulo de Nest, la conexión queda viva |
| Redis del `ThrottlerModule` | Cliente propio con reconexión automática |
| Servidor Socket.io | Dos gateways; si el `app.close()` no llega, el servidor HTTP queda escuchando |
| Los cron del `scheduler` | `@nestjs/schedule` registra temporizadores; si el módulo no se cierra, siguen |

El último candidato es el más probable y el más informativo: el log en vivo muestra el cron
corriendo cada minuto.

**`--forceExit` se admite sólo si el diagnóstico demuestra que la fuga está en una dependencia
ajena que no se puede cerrar** — y entonces se escribe en el fichero, con el porqué. Un
`--forceExit` sin explicación es deuda disfrazada de configuración.

### D3 — `prisma generate` explícito

`npm install` en la raíz dispara el `postinstall` que instala `src/api` y `src/admin`, pero
**ninguno de los dos genera el cliente Prisma** (`src/api/package.json` no tiene `postinstall`).
El cliente puede quedar sin generar además de la base sin esquema. Se añade el paso explícito.

### D4 — Los checkpoints que hoy sólo corre el auditor pasan a CI

`audit-scope.yaml` declara desde PT-120 y PT-121:

- `D1.N1` → `npm run audit:domain`
- `D3` → `npm run audit:observability`

Ambos existen, funcionan y **no tienen job**. Se ejecutan porque el auditor los ejecuta en cada
sesión. Es el mismo patrón que PT-118 arregló para las dependencias, un escalón por debajo.

`audit:domain` necesita base con datos. En CI la base nace vacía, así que **el checkpoint devolvería
`SIN_DATOS`**, y ese es justamente el error que PT-122 documentó al sacar D5 de `ci_checkpoints`:

> *«en CI la base nace vacia en cada corrida: el checkpoint devolveria SIN_DATOS siempre y alguien
> acabaria leyendolo como verde»*

**Por eso `audit:domain` NO entra en CI en este PT.** Entra `audit:observability`, cuyo grueso
—`silent_failure_count`, análisis estático de `catch` mudos— sí es medible sin datos. Y se anota en
`audit-scope.yaml` que D1.N1 es métrica de delta sync, como D5. **Corregir una clasificación
equivocada vale más que añadir un job que mienta.**

### D5 — El job debe poder fallar

Criterio de PT-118, literal: un control que no puede ponerse rojo no es un control. La verificación
de este PT incluye romper algo a propósito y comprobar que el job lo detecta.

---

## Alternativas descartadas

**`db push` en el job.** Verde inmediato, y el artefacto desplegable seguiría sin probarse nunca.
Es la trampa de H-014 replicada en CI.

**`--forceExit` sin diagnóstico.** Tapa el síntoma; si la fuga es real, llega a producción.

**Quitar `test-integration` del `needs` de `build`.** Desbloquearía el pipeline en un minuto y
dejaría el job como adorno. Es peor que no tenerlo: da por cubierta un área que nadie mira.

**Meter `audit:domain` en CI.** Devolvería `SIN_DATOS` en cada corrida y alguien acabaría leyéndolo
como verde. PT-122 ya cometió y corrigió ese error con D5; no se repite.

---

## Componentes tocados

| Fichero | Cambio |
|---|---|
| `.github/workflows/ci.yml` | `prisma generate` + `migrate deploy` en `test-integration`; job de observabilidad |
| `src/api/package.json` | `test:e2e` — sólo si el diagnóstico obliga a `--forceExit` |
| `src/api/test/e2e/*.e2e-spec.ts` | Sólo los que tengan teardown incompleto |
| `src/api/test/e2e/setup.ts` o `globalTeardown` | **posiblemente nuevo**, según el diagnóstico |
| `PTSA/audit-scope.yaml` | D1.N1 se reclasifica como métrica de delta sync |

## Lo que no se toca

`security-audit` (PT-118). Es lo único del pipeline que funciona hoy, y funciona porque es
independiente. Se deja exactamente como está.

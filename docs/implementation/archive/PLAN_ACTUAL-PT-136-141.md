# PLAN_ACTUAL — STATE 2: Clasificación y Estrategia

**Fecha**: 2026-07-28
**PT en el plan**: **PT-136 · PT-137 · PT-138 · PT-139 · PT-140 · PT-141**
**Origen**: revisión de coherencia de registros pedida por el humano — *«se han realizado ya varias
fases y al parecer siempre quedan cosas por hacer y nunca se cierran completo»*.
**ACK de STATE 1**: recibido el 2026-07-28.
**Estado**: esperando ACK de STATE 2. Ninguna rama abierta, cero líneas de `src/` tocadas.

> El plan anterior (**PT-135**, cerrado y fusionado) se conserva en `archive/PLAN_ACTUAL-PT-135.md`.

## Supuesto declarado — corregible

El ACK llegó sin responder las tres decisiones que dejé planteadas. **Sigo mis propias
recomendaciones y las escribo aquí para que se vean y se puedan revocar en el ACK de este estado**:

| Decisión | Lo que asumo | Dónde se aplica |
|---|---|---|
| Disparador de CI | **[B]** — `push`/`pull_request` a `master` + `workflow_dispatch`; se retiran `dev/qa/prep/prod` | PT-136 |
| Contrato de Redis | **[A]** — unificar en `REDIS_URL` | PT-137 |
| Modal de ADMIN | **[A]** — JavaScript propio en `public/js/`, sin traer Bootstrap | PT-139 |

Un dato que refuerza la segunda y no tenía cuando la recomendé: **ADMIN ya lee `REDIS_URL`**
(`src/admin/src/main.ts:81`), igual que `distributed-lock.service.ts`. Los únicos dos clientes fuera
del contrato son las colas Bull y el throttler. Unificar es alinear dos, no cuatro.

---

# Clasificación

| PT | Tipo | Complejidad | Por qué |
|---|---|---|---|
| **PT-136** | BUG | **MAJOR** | Cambia la capa de verificación entera. Su primera ejecución real es un estreno de 8 jobs y de `npm ci` gobernado por los locks de PT-135. Exige análisis de riesgo y de regresión |
| **PT-137** | BUG | STANDARD | Configuración de conexión en 2 ficheros + compose + `.env.example`, con una guarda |
| **PT-138** | BUG | STANDARD | Volúmenes de compose + 2 scripts de auditoría |
| **PT-139** | BUG | STANDARD | 2 plantillas + JS de sitio + 2 guardas |
| **PT-140** | REFACTOR | STANDARD | Sólo registros. Ni una línea de `src/` |
| **PT-141** | REFACTOR | **MAJOR** | Cambia la autoridad documental que `CLAUDE.md` impone a todo agente futuro |

---

# Objetivo

**Que los mecanismos de este repositorio se ejecuten solos y que cerrar algo sea una escritura, no
doce.**

Los seis PT atacan un único defecto en dos planos:

```
plano 1 — verificacion:  se escribe un control -> se ejecuta a mano una vez -> se declara «vigilado en CI»
                                                                                    y CI no corre nunca
plano 2 — registro:      se cierra un trabajo  -> se escribe en 1 de 12 sitios -> los otros 11 dicen PENDING
```

En los dos, **el momento en que algo se declara verdadero y el momento en que alguien lo comprueba
están separados, y nada cierra la distancia**. Es la propiedad que hizo invisibles a H-014, H-015,
H-017, F-33 y F-34. Este plan no añade controles nuevos al catálogo: **pone a correr los que ya hay**
y cierra las dos brechas que impiden comprobarlo.

---

# Solución propuesta — seis piezas, en este orden

## PT-136 — El CI que nunca ha corrido (primero, y bloquea a los demás)

1. **Disparador contra la realidad**: `push` y `pull_request` a `master`, más `workflow_dispatch`.
   Se retiran `dev/qa/prep/prod`.
2. **Ensayo controlado antes del estreno**: con `workflow_dispatch` ya presente, lanzar la corrida a
   mano (`gh workflow run`) **antes** de que un push la dispare sola. Es la diferencia entre estrenar
   los 8 jobs mirando y estrenarlos de espaldas.
3. **Triaje de lo que salga rojo.** R1 dice que saldrá. Cada fallo se clasifica en el acto:
   *defecto real del repositorio* → PT propio, registrado, **no parcheado dentro de PT-136**;
   *defecto del job* → se corrige aquí, porque es el alcance de este PT.
4. **Corregir la cuenta**: son **ocho** jobs, no siete. `HANDOFF.md:50` y `PENDING_TASKS.md:32`.
5. **La guarda**: `ramas-del-disparador-existen.spec.ts` — toda rama nombrada en el `on:` de un
   workflow tiene que existir en el remoto. Con casos de control en los dos sentidos.
6. **Cerrar el criterio 10 de PT-135** con la evidencia de la corrida real.

**Por qué la guarda y no sólo el arreglo**: PT-129 tapó su síntoma con un parche en un `Dockerfile` y
volvió dos veces. La lección literal de PT-135 es que un parche no impide la cuarta vez.

## PT-137 — Un solo contrato para Redis

1. Los tres clientes leen **`REDIS_URL`**: `app.module.ts:61-62` y `throttler-redis.module.ts:31-32`
   se alinean con `distributed-lock.service.ts:12` y con ADMIN.
2. `.env.example` descomenta `REDIS_URL` y retira `REDIS_HOST`/`REDIS_PORT`;
   `configuration.ts:33` acompaña.
3. **Sin reserva silenciosa a `localhost`**: si falta la variable, se falla al arrancar con un
   mensaje que nombre la variable. Es la disciplina de `JWT_SECRET` en PT-126 — una función que lanza
   en vez de un valor por defecto que engaña.
4. `CLAUDE.md` § Environment Variables declara la variable, que hoy no menciona ninguna de las tres.
5. **La guarda**: `variables-de-entorno-declaradas.spec.ts` — toda variable leída por el API existe
   en `.env.example`. Medición preliminar: **49 leídas frente a 37 declaradas** (barrido crudo, a
   afinar en la tarea; el número exacto sale al implementar, y la brecha es real).

## PT-138 — Que las guardas puedan correr donde se ejecuta npm

1. **Montar la raíz del monorepo** en el servicio `api` del compose. Los 8 `*.spec.ts` que resuelven
   `RAIZ` pasan dentro, y `security-baseline.json` viaja solo.
2. **`observability-check.ts` deja de depender del CLI de docker**: habla con la BD por
   `DATABASE_URL`, como el resto del repositorio.
3. **`SIN_DATOS` sale con código distinto de cero.** Hoy `audit:observability` devuelve
   `trace_completeness = SIN_DATOS` y a continuación imprime `OK — sin silencios nuevos`. Es
   exactamente lo que PT-122 aprendió a no tolerar, en la métrica de al lado.
4. Documentar en `CLAUDE.md` la vía del contenedor desechable como alternativa, no como norma.

## PT-139 — Los dos controles muertos de ADMIN

1. `reconciliation.html`: el `<script>` sale de `{% block title %}` y va a `{% block scripts %}`.
2. `refunds.html`: el modal se implementa en `public/js/pages/`, con `classList` —**nunca**
   `style.display = ''`, que devolvería el elemento a lo que diga el CSS— y los `data-bs-*` se
   retiran.
3. **La guarda principal**: `bloques-de-plantilla-existen-en-su-layout.spec.ts`. Resuelve la cadena
   de `{% extends %}` y comprueba que todo `{% block X %}` de una plantilla esté declarado en su
   layout. **Caza los dos de raíz y cualquier tercero futuro.**
4. **La guarda menor**: ninguna plantilla usa `data-bs-*` si Bootstrap no está cargado en ese sitio.
5. Verificación en navegador real: el botón «Conciliar» hace algo, y el modal abre y cierra.

## PT-140 — Un solo registro vivo

1. **Regla de precedencia en `CLAUDE.md`**: qué registro manda para qué clase de pendiente y cuál es
   derivado. Sin esto, lo demás se vuelve a desincronizar en un mes.
2. **`PENDING_TASKS.md` reconstruido contra el código**, cada fila con cita `fichero:línea`.
3. **`PTSA/PENDIENTES.md` podado** a un bloque vivo; los seis anteriores a `PTSA/archive/`, enlazados.
   No se borra nada (`[A6]`).
4. **`HISTORY.log`: las entradas de PT-129 y PT-130**, reconstruidas desde sus evidencias y commits,
   **añadidas al final** con su fecha real anotada. No se reordena.
5. **`ROADMAP.md`**: corrida FPGE real sobre el estado de hoy, o retirada con su razón escrita.
6. **La guarda**: `coherencia-de-registros.spec.ts`, sólo sobre lo determinista —
   - `PENDING`/`BLOCKED` en `PENDING_TASKS.md` ⇒ no `DONE`/`VALIDATION_PENDING` en `HISTORY.log`;
   - carpeta en `evidence/` ⇒ entrada en `HISTORY.log` (**esto solo habría cazado PT-129 y PT-130**);
   - `TD-XXX` cerrada en `10-Technical-Debt.md` ⇒ no pendiente en `PENDING_TASKS.md`.

## PT-141 — Una sola documentación oficial

**PT-141.A, ahora**: ADR-049 (`docs-v2/` es la fuente de verdad); las 10 citas de `CLAUDE.md`
reapuntadas; `docs/enterprise-documentation/` acotado al contrato de agente (`11-Conventions.md`,
`10-Technical-Debt.md`, `inventory/`); corregida la contradicción de `10-Technical-Debt.md:103-105`;
resueltas las citas a `PTSA/Motor-PTSA.md` y `PTSA/PTSA.md` — se escriben o se retiran.

**PT-141.B, después de PT-136…139**: `[START FOUNDATION]` sobre un sistema cuyos defectos conocidos
están cerrados.

---

# Alternativas consideradas

| # | Alternativa | Veredicto |
|---|---|---|
| A1 | **Un solo PT que lo arregle todo** | **Rechazada.** Mezcla CI, infraestructura, frontend y documentación en un diff. Imposible saber qué rompió qué, y viola `[No Dirty Commits]` |
| A2 | **Arreglar los registros primero (PT-140) y el CI después** | **Rechazada.** La guarda de PT-140 nacería sin ejecutarse sola: sería el defecto que corrige, cometido dentro del PT que lo corrige |
| A3 | **CI: añadir `master` conservando `dev/qa/prep/prod`** | **Rechazada.** Declarar ramas que nadie ha creado nunca es exactamente lo que produjo PT-136. Si algún día hay flujo de entornos, entra con su ADR |
| A4 | **Redis: adoptar `REDIS_HOST`/`REDIS_PORT` como contrato** | **Rechazada.** ADMIN y `distributed-lock` ya usan `REDIS_URL`; una URL lleva credenciales y TLS, host+puerto no. Coherente con PT-088 (*una sola fuente*) |
| A5 | **PT-138: comandos que envuelvan un contenedor desechable, sin tocar el compose** | **Rechazada como solución principal**, conservada como vía documentada. Deja la contradicción de RULE-15 en pie y exige que cada persona conozca una invocación de tres volúmenes |
| A6 | **ADMIN: incorporar Bootstrap** | **Rechazada.** Dependencia nueva, CSS que revisar y riesgo con una CSP sin `'unsafe-inline'`, para resolver un modal |
| A7 | **Regenerar Foundation ya** | **Rechazada como orden.** Documentaría el CI que no corre y las pantallas muertas como si fueran diseño. Va en PT-141.B |
| A8 | **Retirar `docs/enterprise-documentation/` entero** | **Rechazada.** `11-Conventions.md` es el contrato operativo de todo agente y `10-Technical-Debt.md` tiene guarda (PT-103). Se acota, no se retira |
| A9 | **PT-140: guarda que compruebe también la prosa** | **Rechazada.** Una guarda que obliga a redactar para pasar es peor que ninguna. Sólo lo determinista |

---

# Dependencias

```
PT-136 (CI corre)  ──┬──> PT-140  (su guarda necesita CI)   ──┐
                     ├──> PT-139  (su guarda necesita CI)     ├──> PT-141.B (regenerar Foundation)
                     ├──> PT-137, PT-138  (idem)              │
                     └──> cierra el criterio 10 de PT-135     │
PT-141.A (decision documental) ───────────────────────────────┘
```

- **PT-136 primero**, sin excepción. Los otros cinco entregan **cuatro guardas nuevas** entre todos;
  sin CI todas nacen con el defecto que este plan corrige.
- **PT-141.A puede ir en paralelo a PT-136**: no comparte ficheros y detiene la doble escritura
  documental que hoy paga cada PT.
- **PT-137, PT-138 y PT-139 son independientes entre sí.**
- **Externo, no se intenta**: H-005 (quién emite la factura) sigue siendo decisión de negocio y
  fiscal; TD-001/TD-002 siguen bloqueadas por PAC y credenciales.

---

# Riesgos

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|:--:|:--:|---|
| **R1** | **La primera corrida real de CI sale roja.** Precedente literal: PT-128 ejecutó los 17 ficheros e2e por primera vez y **42 de 80 tests fallaron** | **Alta** | Medio | **Es el resultado esperado, no el fracaso.** Ensayo con `workflow_dispatch` antes del primer push. Cada fallo se triará: defecto real → PT propio; defecto del job → se corrige aquí |
| **R2** | `npm ci` gobernado por los locks de PT-135 **estrena en CI** | Media | Alto | Ya ensayado en contenedor (exit 0, `postinstall` instalando api y admin). No lo sustituye: es criterio explícito |
| **R3** | PT-140 marca hecho algo que no lo está — el defecto que corrige, cometido otra vez | Media | Alto | Cita `fichero:línea` verificada por cada cambio de estado (disciplina de PT-090) **más** la guarda, que es lo que PT-090 no tuvo |
| **R4** | Montar la raíz en `api` altera el arranque o el watch | Media | Medio | Ciclo completo levantar → `healthy` → recarga en caliente, antes de darlo por bueno |
| **R5** | Unificar Redis rompe el rate limiting **sin que se note** | Baja | **Alto** | El throttler defiende los endpoints de auth (5–30 req/min). Se ejerce con peticiones reales hasta ver el 429, no sólo con la suite. Es la forma de F-34 y se trata como tal |
| **R6** | Regenerar Foundation rompe las citas que vigila la guarda de PT-130 | Media | Alto | Las dos guardas documentales se ejecutan antes y después. H-016 volvería **con aval** si no |
| **R7** | El modal reescrito a mano se comporta distinto del de Bootstrap (foco, `Esc`, fondo) | Media | Bajo | Verificación en navegador real, no sólo «el botón responde» |
| **R8** | Cuatro guardas nuevas ralentizan la suite | Baja | Bajo | Las 93 suites actuales tardan **13 s**. Hay margen |
| **R9** | Se abren cinco PT a la vez y ninguno se cierra — el defecto original, a mayor escala | Media | Alto | Se ejecutan **en el orden del grafo**, uno cerrado antes del siguiente salvo los tres independientes. PT-140 es el que impide que esto sea invisible |

---

# Análisis de regresión (obligatorio)

## Qué puede romperse

| Área | Qué podría romperse | Cómo se comprueba |
|---|---|---|
| **Colas Bull** (PT-137) | Notificaciones y trabajos programados dejan de encolarse si la URL no se resuelve | Encolar un trabajo real y verlo consumido; log del API sin `ECONNREFUSED` |
| **Rate limiting** (PT-137) | Los límites de auth caen a un cliente en `localhost` que no existe → **sin protección, en silencio** | Peticiones reales contra un endpoint de auth hasta ver **429** |
| **Cerrojo distribuido** (PT-137) | Ya usa `REDIS_URL`; el riesgo es la validación nueva de arranque | Arranque del API con y sin la variable: uno vive, el otro **falla con mensaje que la nombra** |
| **Arranque del API** (PT-138) | Montar la raíz cambia lo que el contenedor ve; podría chocar con los montajes de `/app/src` | `docker compose up` → `healthy` + recarga en caliente tras editar un fichero |
| **Los 8 jobs** (PT-136) | Cualquiera puede fallar por primera vez | Corrida completa con `workflow_dispatch` y triaje job a job |
| **ADMIN** (PT-139) | Retirar `data-bs-*` podría afectar al estilo si algún CSS cuelga de esos atributos | `grep` de `data-bs` en el CSS de ADMIN antes de tocar; revisión visual de las dos pantallas |
| **CSP de ADMIN** (PT-139) | JS nuevo que use `style=` u `onclick=` **no funcionaría y el navegador no diría nada** | `plantillas-sin-js-inline.spec.ts` y `estilos-fuera-de-plantillas.spec.ts` deben seguir verdes |
| **Orden de `<script>`** (PT-139) | Mover un `<script>` de bloque puede alterar el orden — **es la avería exacta de F-34** | `orden-de-scripts.spec.ts` |
| **Guardas documentales** (PT-140, PT-141) | Mover documentos rompe las citas `fichero:línea` que vigilan | `coherencia-documentacion-codigo.spec.ts` y `coherencia-deuda-tecnica.spec.ts` antes y después |
| **Suite completa** | Regresión general | **944 unitarias · 77 e2e · 176 por navegador**, más las 4 guardas nuevas |

## Lo que NO debe cambiar de comportamiento

- **Nada del dominio**: subastas, pujas, monedero, pagos, retiros, disputas. Ningún endpoint cambia
  de contrato. PT-137 es lo único que toca `src/api/src/`, y sólo configuración de conexión.
- **Ningún dato.** Ninguno de los seis genera migración.
- **`HISTORY.log` no se reescribe**: sólo se le añade al final.
- **Los hallazgos PTSA no se cierran**: `[R44]` sigue vigente. H-005 es del humano.
- **`docs-v2/` no se reescribe** en PT-141: se decide su estatus, no su contenido.

---

# Restricciones

1. **RULE-14** — las cuatro guardas nuevas se prueban en los dos sentidos, con casos de control.
2. **RULE-15** — npm se ejecuta en el contenedor. PT-138 existe porque esa regla y la forma de correr
   ocho guardas no encajan todavía.
3. **Cerrar son dos escrituras** — código y registro. PT-140 convierte esa regla en mecanismo.
4. **Tests primero (RED)** en los cuatro PT que entregan guarda.
5. **Commits atómicos**, uno por cambio lógico, trazables a su PT.
6. **`run-all.sh` trunca la base de datos** — copia con `pg_dump` antes de cualquier corrida QA.
7. **`docker compose down -v` borra la base.** Para recrear sólo el `node_modules` de un servicio:
   `docker compose rm -fsv api`.
8. **Cero deuda diferida**: lo que estos PT destapen se resuelve dentro o se abre como PT propio con
   su registro. *«Registrado para más adelante»* no es una salida disponible.

---

# Criterios de éxito

| # | Criterio | Medible por |
|---|---|---|
| 1 | **Los 8 jobs de CI se ejecutan en un push real a `master`** | `gh run list` deja de estar vacío |
| 2 | Lo que salga rojo está **triado y registrado**, no silenciado | Un PT por cada defecto real encontrado |
| 3 | `audit:schema`, `audit:check` y `audit:observability` tienen **ejecución real en CI** | Log de los tres jobs |
| 4 | El API arranca con `REDIS_URL` y **falla nombrando la variable** si falta | Arranque en los dos sentidos |
| 5 | Un **429 real** demuestra que el rate limiting sigue vivo | Peticiones contra un endpoint de auth |
| 6 | Las 8 guardas que leen la raíz **corren dentro del contenedor** | `docker exec ... npx jest` |
| 7 | `audit:observability` con `SIN_DATOS` **sale distinto de cero** | Código de salida |
| 8 | El botón «Conciliar» hace algo y el modal de reembolsos abre y cierra | Navegador real |
| 9 | Las **4 guardas nuevas** en verde con sus casos de control | Suite |
| 10 | **Cero contradicciones** entre `PENDING_TASKS.md`, `HISTORY.log` y `10-Technical-Debt.md` | `coherencia-de-registros.spec.ts`, no lectura humana |
| 11 | `HISTORY.log` tiene una entrada por cada carpeta de `evidence/` | La misma guarda |
| 12 | Un lector nuevo sabe **dónde apunta un pendiente** y **qué árbol documental consultar** | `CLAUDE.md` |
| 13 | Ninguna ruta citada en `CLAUDE.md` apunta a un fichero inexistente | Hoy fallan dos |
| 14 | **Criterio 10 de PT-135 cerrado**, con evidencia de corrida real | PT-135 pasa a poder validarse entero |
| 15 | Regresión completa sin pérdidas: **944 · 77 · 176** | Informe de pruebas |

---

**STOP. Esperando ACK de STATE 2.**
Siguiente paso tras el ACK: **STATE 3** — Proposal Package en `changes/` para los seis PT
(`design.md`, `tasks.md`, `spec-changes.md`, `test-scenarios.md`, `out-of-scope.md`), y **ahí está el
Proposal Gate**: hasta ese segundo ACK no se abre ninguna rama ni se toca una línea de código.
`[No Proposal Gate Skip]`

---

# Anexo — PT-142 y PT-143 (2026-07-28)

**Origen**: los destapó la primera ejecución de CI, dentro de PT-136. No estaban en el plan de arriba
porque **no se sabía que existían**: hacía falta que el pipeline corriera para verlos.
**Decisión del humano**: PT-142 entra **antes** que PT-137/138/139.

## PT-142 — La creación perezosa que no es atómica

**Tipo**: BUG · **Complejidad**: STANDARD

### Objetivo

Que crear una fila que puede no existir deje de ser *comprobar y actuar*. Son **cuatro sitios**, y
**tres están en el camino del dinero**.

### Solución propuesta

1. **RED**: una prueba concurrente — N creaciones simultáneas del mismo monedero — que falle hoy con
   `P2002`. Sin RED no hay GREEN: una carrera «arreglada» sin prueba que falle no está arreglada.
2. **`upsert`** en los cuatro sitios. La base resuelve la carrera, que es donde se resuelve.
3. **Repetir el barrido** con `findFirst` y `count`, no sólo `findUnique`. Lo que quede se declara.
4. **Ejercer el ciclo de pago real**, no sólo la suite: el monedero es dinero.
5. **RULE-22** y su guarda: ninguna creación de una fila con restricción de unicidad se hace con
   `findX` + `create`.

### Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| `try/catch` sobre `P2002` y releer | Funciona y esconde la intención. `upsert` dice lo que quiere hacer |
| Subir el nivel de aislamiento de la transacción | Caro y global, para resolver cuatro sitios |
| Un cerrojo distribuido (existe: `distributed-lock.service.ts`) | Coordinación de red para algo que la base resuelve con una restricción que **ya está declarada** |
| Arreglar sólo `system-config` (lo que CI cazó) | Dejaría los tres del dinero, que son los graves |

### Criterios de éxito

1. La prueba concurrente **falla antes** y pasa después.
2. Los cuatro sitios, sin `findX` + `create`.
3. `test-integration` en verde en CI → **`build` y `docker` se ejecutan por primera vez**.
4. Un depósito real se acredita a un usuario **sin monedero previo**.
5. 702 unitarias + 77 e2e sin pérdidas.

### Análisis de regresión

| Área | Qué podría romperse | Cómo se comprueba |
|---|---|---|
| **Depósito** (sitio 3) | Que la acreditación deje de ocurrir o se duplique | Depósito real; **un solo asiento** en `payments` por referencia |
| **Cierre de subasta** (sitio 4) | El abono al vendedor, o el holdback de PT-071 | Ciclo completo de subasta con `pendingBalance` correcto |
| **`getWallet()`** (sitio 2) | Que devuelva un monedero distinto del que crea el depósito | La misma fila: `userId` es única |
| **Arranque** (sitio 1) | Que la configuración no se siembre | Arranque limpio contra base vacía |

## PT-143 — La suite e2e no aísla sus datos

**Tipo**: BUG · **Complejidad**: STANDARD · **Estado**: `PENDING`, después de PT-142.

Se planifica cuando le toque. Lo único que este anexo fija es lo que **no** vale como solución:
**`--runInBand` queda descartado**. Haría verde una suite que sigue sin poder correr en paralelo, y
este PT existe porque algo verde tapaba un defecto.

---

**STOP para PT-142.** Su Proposal Package está en `changes/PT-142-creacion-perezosa-atomica/`.
Ninguna rama abierta.

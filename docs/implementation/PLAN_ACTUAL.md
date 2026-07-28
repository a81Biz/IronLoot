# PLAN_ACTUAL — STATE 2: Clasificación y Estrategia

**Fecha**: 2026-07-27
**Origen**: sesión PTSA **S-002** — hallazgos H-014, H-015, H-016, H-017
**PT en el plan**: PT-127 · PT-128 · PT-129 · PT-130
**Estado**: **PENDIENTE DE ACK HUMANO** (STATE 2). Ninguna rama abierta, ningún fichero de código tocado.

> El plan anterior (PT-120, Domain Rules as Code) está cerrado y registrado en `HISTORY.log`.
> `PLAN_ACTUAL.md` es sobrescribible por definición: sólo puede haber un plan activo.

---

## Por qué los cuatro van en un solo plan

No es agrupación por comodidad. Los tres hallazgos de D2 son **el mismo camino visto desde tres
sitios**, y la auditoría lo dejó medido:

```
Desarrollador  ──>  esquema (PT-127)  ──>  pipeline (PT-128)  ──>  imagen (PT-129)  ──>  produccion
                        ROTO                    ROTO                   ROTO
```

Ese camino **no se ha recorrido nunca de principio a fin**. Arreglar una pieza sin las otras deja el
mismo agujero: es exactamente lo que pasó con PT-037, que reconcilió las migraciones el 23-jul y las
vio divergir otra vez en cuatro días porque nada las volvía a mirar.

PT-130 (documentación) es independiente y puede ir en cualquier momento, pero comparte causa raíz
con los otros tres: **una segunda escritura que nada obliga a hacer**.

---

## Clasificación

| PT | Hallazgo | Tipo | Complejidad | Justificación de la complejidad |
|---|---|---|---|---|
| **PT-127** | H-014 (CRITICA) | BUG | **MAJOR** | Cambia el mecanismo de evolución del esquema de toda la plataforma. Exige análisis de riesgo y de regresión obligatorios |
| **PT-128** | H-015 (ALTA) | BUG | **STANDARD** | Cambio acotado a `ci.yml` + posible ajuste de teardown en la suite e2e |
| **PT-129** | H-017 (ALTA) | BUG | **STANDARD** | Corrección de una línea + tres Dockerfiles nuevos siguiendo un patrón existente |
| **PT-130** | H-016 (MEDIA) | BUG | **STANDARD** | La corrección es trivial; la prueba que impide la recurrencia no lo es |

---

# PT-127 — Reconciliar las migraciones y cerrar la vía que las deja divergir

## Objetivo

Que `prisma migrate deploy` sobre una base limpia produzca **exactamente** el esquema que
`schema.prisma` declara, que la base de desarrollo tenga historial de migraciones, y que un cambio
futuro de esquema sin migración **falle de forma visible** en vez de pasar desapercibido.

## Solución propuesta

Cuatro piezas, en orden:

**1. Generar la migración que falta — no escribirla.**

```
prisma migrate diff --from-migrations prisma/migrations \
                    --to-schema-datamodel prisma/schema.prisma \
                    --shadow-database-url <postgres temporal> --script
```

Es la decisión D1 de PT-037 y funcionó. El SQL sale del esquema, que es la fuente de verdad.

**2. Baselinear la base de desarrollo.** `migrate resolve --applied` sobre las 23 + la nueva, para
crear `_prisma_migrations` sin ejecutar SQL sobre datos existentes. Es el paso que PT-037 dejó
declarado como pendiente y nadie recogió.

**3. Cambiar el punto de aplicación.** `entrypoint.dev.sh:52`: `db push --accept-data-loss` pasa a
`migrate deploy`. Con el respaldo invertido: si `migrate deploy` falla, **el arranque falla y se
ve**, en vez de caer a un `db push` silencioso.

**4. El control que impide la recurrencia.** Una comprobación que corre en CI y falla si
`schema.prisma` y las migraciones divergen:

```
prisma migrate diff --from-migrations … --to-schema-datamodel … --exit-code
```

Devuelve 2 si hay diferencias. Es el equivalente para el esquema de lo que `audit:check` (PT-118)
es para las dependencias.

**Sin la pieza 4 este PT no está terminado.** Las piezas 1-3 son lo que ya hizo PT-037.

## Alternativas consideradas

**A — Reconciliar conservando el historial (la propuesta).** Migración nueva de reconciliación +
baseline de las 24. Conserva las 23 carpetas.

**B — Colapsar las 23 en una migración inicial.** Borrar la carpeta, generar una sola migración
desde `schema.prisma`, baselinear. Más limpio y verificable en un paso: `deploy` sobre base vacía →
`diff` = 0.

**C — Sólo baselinear, sin migración de reconciliación.** Marcar las 23 como aplicadas y seguir.

## Alternativas rechazadas

**C, rechazada.** Deja las migraciones divergiendo del esquema para siempre: la base de desarrollo
quedaría con historial, y un entorno limpio seguiría recibiendo un esquema roto. Arregla el
síntoma visible (`migrate status`) y no el defecto.

**B, no rechazada — es la alternativa real, y hay un argumento fuerte a su favor.**
**Ningún entorno ha aplicado nunca esas 23 migraciones.** El historial que encoden no se ha
ejecutado en ningún sitio, y está demostrado que no produce el esquema actual. Conservarlo conserva
una ficción. Además, git ya guarda la historia; la carpeta `migrations/` no es el registro
histórico, es el artefacto de despliegue.

**Se propone A y se señala B como decisión abierta.** El argumento decisivo es una información que
el auditor no tiene: **si existe algún entorno (staging, el portátil de alguien, una copia) donde
esas migraciones sí se hayan aplicado.** Si existe, A es obligatoria. Si no existe —y todo lo
observado apunta a que no— **B es mejor**.

> **Decisión requerida del humano en el Proposal Gate.** Ver `changes/PT-127-*/design.md` § D1.

## Dependencias

- PostgreSQL 16 disponible para base sombra — **cumplida** (`ironloot-db` en marcha).
- Ninguna dependencia de otro PT. **PT-127 va primero.**

## Riesgos

| # | Riesgo | Severidad | Mitigación |
|---|---|:--:|---|
| R1 | SQL escrito a mano que no refleja el esquema | ALTA | Generarlo con `migrate diff`. Nunca a mano |
| R2 | **Pérdida de los datos reales que sostienen la auditoría** | **CRÍTICA** | `ironloot_db` guarda la salida real que valida 11 productos PTSA. Copia (`pg_dump`) **antes** de tocar nada. `migrate resolve` no ejecuta SQL: es la operación segura |
| R3 | El drift vuelve, como tras PT-037 | ALTA | Es la pieza 4. Sin ella, el PT se rechaza a sí mismo |
| R4 | `migrate deploy` en el arranque de dev falla y nadie puede levantar el entorno | MEDIA | Se prueba en base sombra antes. Y que falle ruidosamente es el objetivo, no el riesgo |
| R5 | Colapsar (vía B) rompe un entorno desconocido que sí aplicó las migraciones | MEDIA | Es exactamente la pregunta que el humano debe responder en el Gate |

## Restricciones

- `schema.prisma` **no se modifica**: es el objetivo, no la variable.
- `ironloot_db` es dato de auditoría. Ninguna operación destructiva sin copia previa.
- `db push` se **sustituye**, no se prohíbe por documentación. PT-037 intentó lo segundo y falló.

## Análisis de regresión (obligatorio — MAJOR)

**Qué puede romperse:**

| Área | Riesgo de regresión | Cómo se comprueba |
|---|---|---|
| Arranque del contenedor de API | `migrate deploy` falla donde `db push` funcionaba | Reiniciar `ironloot-api` y ver el log de arranque |
| Los 33 modelos / 603 tests | Un DDL generado que difiera del esquema | `npx jest` completo + `prisma migrate diff` = 0 |
| Datos de la auditoría PTSA | `migrate resolve` no ejecuta SQL; `deploy` sí | Recuento antes/después: wallets 4, ledger 15, payments 1, bids 3 |
| Los cuatro checkpoints | `audit:domain`, `audit:check`, `audit:observability`, `audit:reliability` | Los cuatro deben seguir verdes |
| Flujos de negocio | Ninguno toca lógica | Regresión sólo por esquema |
| Entornos de terceros | **Desconocido** — es la pregunta del Gate | — |

**Integridad de datos**: el riesgo real está en aplicar SQL a una base con datos. La vía elegida
(baseline con `resolve`) evita ese SQL por completo en la base existente. Un entorno limpio recibe
todo el SQL, que es donde se prueba.

## Criterios de éxito

1. `prisma migrate deploy` sobre base vacía → esquema idéntico a `schema.prisma`.
2. `prisma migrate diff --from-migrations --to-schema-datamodel --exit-code` → **0 diferencias**.
3. Las cuatro sondas del cliente Prisma que hoy fallan 3 de 4 → **4 de 4 OK**.
4. `payments.reference` es **UNIQUE** en la base construida desde migraciones.
5. `prisma migrate status` sobre `ironloot_db` → sin migraciones pendientes.
6. Los datos de la auditoría intactos: wallets 4 · ledger 15 · payments 1 · bids 3.
7. 603 tests del API y 134 de CORE en verde. `typecheck` limpio.
8. La comprobación de drift **falla** al introducir un cambio de esquema sin migración, y **pasa**
   al generarla. Probado en los dos sentidos, como PT-118.

---

# PT-128 — Que el job de integración pueda pasar, y que verifique algo

## Objetivo

Que `test-integration` aplique el esquema, ejecute los 17 ficheros e2e, termine, y desbloquee
`build` y `docker`. Y que al hacerlo **sea la prueba de que las migraciones de PT-127 funcionan**.

## Solución propuesta

1. **Añadir al job**, antes de los tests: `prisma generate` y **`prisma migrate deploy`** — no
   `db push`. Así el job verifica PT-127 en cada push, gratis.
2. **Diagnosticar los manejadores abiertos** con `--detectOpenHandles` y cerrarlos donde estén
   (candidatos: cliente Prisma sin `$disconnect`, Redis del throttler, servidor Socket.io).
3. **`--forceExit` sólo si el diagnóstico demuestra que la fuga es de una dependencia ajena**, y
   dicho en el fichero con el porqué.
4. Añadir al pipeline los checkpoints que hoy sólo corre el auditor a mano: `audit:domain` (D1.N1)
   y `audit:observability` (D3), declarados en `audit-scope.yaml` desde PT-120 y PT-121.

## Alternativas consideradas

**A — `db push` en el job.** Un paso, siempre funciona.
**B — `migrate deploy` (la propuesta).**
**C — Poner `--forceExit` y no diagnosticar.**

## Alternativas rechazadas

**A, rechazada.** Haría verde un pipeline que sigue sin probar las migraciones. Es la trampa exacta
que causó H-014: el camino cómodo que no deja rastro.

**C, rechazada como solución.** Tapa el síntoma. Si la fuga es real —una conexión que la aplicación
no cierra— vuelve en producción como conexiones colgadas. Se admite **sólo** con diagnóstico previo
que demuestre que es ajena, y documentado.

## Dependencias

- **PT-127 debe estar terminado.** Si `migrate deploy` no produce un esquema correcto, este job no
  puede pasar. **Orden obligado.**

## Riesgos

| # | Riesgo | Severidad | Mitigación |
|---|---|:--:|---|
| R1 | Los 17 ficheros e2e fallan por razones ajenas | **ALTA** | Sólo se probó `auth` (9 tests). **El resto no se ha ejecutado nunca con éxito.** Puede aparecer trabajo real y no previsto |
| R2 | `--forceExit` esconde una fuga que llega a producción | ALTA | Diagnóstico obligatorio antes de decidir |
| R3 | El job tarda demasiado | BAJA | Medido: `auth` en 22 s |
| R4 | El pipeline queda rojo y estorba | MEDIA | **Es el objetivo.** Un job que no puede fallar no verifica nada |

> **R1 es el riesgo que puede cambiar el tamaño de este PT.** Si al ejecutar los 17 ficheros
> aparecen fallos legítimos, se registran como hallazgos nuevos y **no se arrastran a este PT**.

## Restricciones

- **`security-audit` no se toca.** Es lo único del pipeline que funciona (PT-118).
- El job debe fallar de verdad cuando algo va mal.

## Análisis de regresión

| Área | Riesgo | Comprobación |
|---|---|---|
| Los otros jobs de CI | Ninguno: cambios acotados a `test-integration` | Los cinco jobs con su resultado |
| Suite unitaria (603 tests) | Si se toca el teardown de e2e, no debería afectar | `npx jest` completo |
| Código de aplicación | Sólo se toca si el diagnóstico encuentra una fuga real | Revisión del diff |

## Criterios de éxito

1. `test-integration` **termina** y en verde, con los 17 ficheros ejecutados.
2. `build` y `docker` se ejecutan (hoy no lo hacen nunca).
3. El job aplica el esquema con `migrate deploy` — verifica PT-127 en cada push.
4. Si se usa `--forceExit`, hay diagnóstico escrito que lo justifica.
5. `audit:domain` y `audit:observability` corren en CI.
6. El job **falla** si se rompe algo a propósito. Probado en los dos sentidos.

---

# PT-129 — Una imagen de producción que arranca y se ve sana

## Objetivo

Que exista imagen desplegable de los cuatro servicios, que arranquen, y que su healthcheck pase a
verde — comprobado, no declarado.

## Solución propuesta

1. `src/api/Dockerfile`: `/health` → **`/api/v1/health`**, y alinear el criterio con el de
   desarrollo: `< 500` más el manejador de error de conexión.
2. Tres `Dockerfile` de producción nuevos (ADMIN, BASE, CLIENT) siguiendo el patrón del de API:
   multi-stage, `npm prune --production`, usuario no-root, healthcheck correcto. **Con
   `@ironloot/core` resuelto en el build** — en desarrollo lo enlaza el entrypoint a mano y en
   producción no hay equivalente.
3. `ci.yml`: corregir la ruta del job `docker`.
4. **Que el pipeline construya y arranque cada imagen una vez**, y compruebe healthcheck en verde y
   una página real servida.

## Alternativas consideradas

**A — Sólo arreglar el healthcheck del API.** Mínimo, cierra un tercio del hallazgo.
**B — Las cuatro imágenes y la verificación en el pipeline (la propuesta).**

## Alternativas rechazadas

**A, rechazada.** Dejaría tres servicios sin artefacto de despliegue y el job `docker` apuntando a
un fichero inexistente. Cerraría el hallazgo en el papel y no en la realidad. Y sobre todo: sin el
punto 4, **nadie habría visto nunca el healthcheck pasar**, que es la causa raíz.

## Dependencias

- **PT-128** para el punto 4: sin pipeline en verde no hay dónde arrancar la imagen.
- **PT-127** indirectamente: una imagen que arranca contra una base necesita el esquema.

## Riesgos

| # | Riesgo | Severidad | Mitigación |
|---|---|:--:|---|
| R1 | `@ironloot/core` no resuelve en el build de producción | **ALTA** | Es el riesgo real y no estaba en el hallazgo. Se resuelve en el build; se verifica arrancando |
| R2 | Los SSR necesitan `views/` y `public/` en la imagen | ALTA | Verificación obligatoria: pedir una **página real**, no sólo el healthcheck |
| R3 | Dos definiciones de healthcheck vuelven a divergir | MEDIA | Una sola definición; `docker-compose` la hereda |
| R4 | Escribir tres Dockerfiles sin precedente introduce fallos nuevos | MEDIA | El del API es el patrón; se copia y se prueba |

## Restricciones

- **`docker-compose` no cambia de comportamiento.** Es el entorno de trabajo diario.
- Decidir el criterio del healthcheck **con argumento**: `< 500` distingue «degradado» de «muerto»,
  que es la distinción útil cuando `/health/detailed` reporta una dependencia caída.

## Análisis de regresión

| Área | Riesgo | Comprobación |
|---|---|---|
| Entorno de desarrollo diario | Si se toca `docker-compose` o los `.dev` | `docker-compose up -d` y los cuatro servicios `healthy` |
| Los cuatro servicios en marcha | Ninguno: las imágenes de producción son artefactos nuevos | Nada en ejecución cambia |
| Tamaño de imagen / tiempo de build | Aumenta el tiempo del pipeline | Medir y anotar |

## Criterios de éxito

1. `docker build` de los cuatro servicios: **construye**.
2. Cada imagen arranca y su healthcheck llega a **`healthy`** — observado con `docker ps`.
3. Cada SSR sirve una **página real** desde su imagen de producción, no sólo el healthcheck.
4. El job `docker` de CI apunta a ficheros que existen y construye.
5. `docker-compose up -d` sigue dejando los cuatro servicios `healthy` como hoy.

---

# PT-130 — Que la documentación no pueda mentir en silencio

## Objetivo

Corregir las afirmaciones falsas conocidas, barrer los cinco documentos del alcance en busca de
más, y dejar una prueba que falle cuando el código y la documentación se separen.

## Solución propuesta

1. Corregir `03-TRD.md:13`, `06-Backend-Architecture.md:9-13` y `CLAUDE.md:138`.
2. Barrer los cinco documentos de `coverage_targets.docs` buscando más afirmaciones contrastables.
3. Escribir `test/unit/documentacion/coherencia-documentacion-codigo.spec.ts`: compara **versiones
   citadas** contra los `package.json` y **rutas citadas** contra el prefijo global. Con caso de
   control, como el resto de pruebas de este tipo en el repositorio.
4. Revisar si `coherencia-deuda-tecnica.spec.ts` ya puede entrar en CI: no lo hacía porque `docs/`
   estaba gitignored, y **eso ya no es cierto** (H-009 corregido).

## Alternativas consideradas

**A — Corregir los tres casos y ya.** Diez minutos.
**B — Corregir + prueba que lo vigile (la propuesta).**

## Alternativas rechazadas

**A, rechazada.** Es la tercera vez que este repositorio se encuentra con documentación que miente
(PT-090, PT-103/F-33, y ahora H-016). Las dos veces anteriores se corrigió a mano y volvió. El
propio CLAUDE.md lo tiene escrito: *«Sólo la primera la obliga el compilador»*.

## Dependencias

- **PT-128** para el punto 4 (meter la prueba en CI y que sirva de algo).
- Las correcciones documentales no dependen de nada: pueden ir primero.

## Riesgos

| # | Riesgo | Severidad | Mitigación |
|---|---|:--:|---|
| R1 | La prueba es frágil y alguien la desactiva | ALTA | Comprobar **sólo afirmaciones citadas con fichero:línea o versión explícita**, nunca prosa |
| R2 | El barrido saca más casos y el PT crece | MEDIA | Este PT corrige lo encontrado y deja el mecanismo. Lo que aparezca de más se registra, no se arrastra |
| R3 | `CLAUDE.md` es instrucción vinculante: un error al editarlo afecta a todo agente futuro | MEDIA | Cambio mínimo y acotado a la fila del `health` |

## Restricciones

- El patrón de prueba **ya existe** en el repositorio y se copia, no se inventa.
- Toda prueba de este tipo en este repositorio lleva **caso de control**. Esta también.

## Análisis de regresión

| Área | Riesgo | Comprobación |
|---|---|---|
| Código de aplicación | **Ninguno**: sólo documentación y una prueba nueva | — |
| Suite de tests | Un test nuevo que falle en verde por error | `npx jest` completo |
| CLAUDE.md como instrucción | Un cambio que altere una regla vinculante | Diff revisado línea a línea |

## Criterios de éxito

1. Las tres afirmaciones conocidas coinciden con su fuente citada.
2. Barrido de los cinco documentos hecho; lo encontrado, corregido o registrado.
3. La prueba nueva **falla** con la documentación de hoy sin corregir, y **pasa** después. Probada
   en los dos sentidos.
4. Decidido —y escrito— si `coherencia-deuda-tecnica.spec.ts` entra en CI.

---

# Orden de ejecución propuesto

```
PT-127  (esquema)   ──>  PT-128  (pipeline)   ──>  PT-129  (imagen)
                                                        │
PT-130  (documentacion) ────────────────────────────────┘  (independiente; el punto 4 espera a PT-128)
```

**PT-127 primero, y sin discusión**: es el único CRITICA, y su corrección es el paso que PT-128
necesita. PT-129 va al final porque su verificación real —arrancar la imagen— vive en el pipeline
que arregla PT-128.

PT-130 puede ir en paralelo en su parte documental.

---

# Lo que este plan NO resuelve

- **H-005** (CFDI, D1, ALTA) — no es técnico: nadie ha decidido quién emite la factura. Las tres
  opciones están en `PTSA/Fases/F-1_Declaracion_Valor.md` § U-005. **Sin decisión de negocio no hay
  PT posible.**
- La segunda pasada al área de despliegue: `.github/workflows/**`, `src/api/scripts/**` y los
  `Dockerfile` entraron en el alcance de auditoría en S-002 y **sólo llevan una pasada**.

---

# PARADA — STATE 2

**Se requiere ACK humano antes de abrir rama y tocar código (STATE 4).**

Los cuatro Proposal Packages (STATE 3) ya están generados en `changes/`.

## Decisión del Gate — **RESUELTA (2026-07-27)**

> **¿Existe algún entorno donde las 23 migraciones sí se hayan aplicado?** → **No.**

El humano confirmó que sólo se ha trabajado en esta máquina, y se verificó:

```
git log --all --format="%an <%ae>" | sort -u   ->  un unico autor
git rev-parse master origin/master             ->  328b421 == 328b421
```

**PT-127 va por la vía B: colapsar las 23 en una migración inicial.** El riesgo R5 desaparece.

Y sobre **todo** el historial —57 ramas— se confirmó que las migraciones que faltan no existen en
ninguna rama sin fusionar:

```
git grep -l "AUCTION_SOLD"          $(git rev-list --all) -- 'src/api/prisma/migrations/*'  -> vacio
git grep -l "account_verifications" $(git rev-list --all) -- 'src/api/prisma/migrations/*'  -> vacio
```

## Revisión S-002-R2 — PT-130 crece

Al verificar una objeción humana sobre la documentación de la migración a NestJS 11, apareció que
el defecto de H-016 es mayor de lo registrado: **las cinco citas de la tabla de stack de
`03-TRD.md` apuntan a la línea equivocada, y tres de las cinco versiones son falsas** (NestJS
11.1.28 declarado `^10.3.0`; Prisma 5.22.0 declarado `^5.8.0`; TypeScript 5.9.3 declarado
`^5.3.3`).

**H-016 sube de MEDIA a ALTA.** El orden de prioridad cambia: PT-130 pasa del cuarto puesto al
**segundo por riesgo** (9 ALTO), y sigue siendo el más barato de los cuatro. Es buen primer paso
mientras se decide el resto.

Y una corrección de redacción, no de medición: **la migración a NestJS 11 sí está documentada** —
PT-126 dejó `REFACTOR_SCOPE.md`, `CONTEXT_ANALYSIS.md`, `HISTORY.log` y `HANDOFF.md`. H-016 es sobre
`docs/enterprise-documentation/`, que es otro corpus.

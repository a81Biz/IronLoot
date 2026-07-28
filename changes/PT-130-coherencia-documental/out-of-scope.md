# PT-130 — Fuera de alcance

---

## No entra

### Los tres hallazgos de D2
Migraciones (PT-127), pipeline (PT-128) e imagen (PT-129). Este PT sólo depende de PT-128 para la
tarea .8 (meter las guardas en CI), y esa tarea queda **bloqueada** hasta entonces.

### Revisar toda la documentación del repositorio
El alcance son los **cinco documentos de `coverage_targets.docs`**. `docs-v2/`, `docs/methodology/`,
`README.md`, `CHANGELOG.md` y los ficheros de `docs/implementation/` **no entran**.

### Comprobar prosa, decisiones o descripciones
La guarda mira **versiones citadas y rutas HTTP**. Nada más. Es la decisión D1 y existe para que la
guarda sobreviva: una prueba con falsos positivos acaba desactivada, y con ella lo que sí protegía.

### Generar el TRD automáticamente
Eliminaría la clase entera de defecto y también el juicio humano que hace útil el documento. Y sería
un PT mucho mayor.

### Añadir un alias `/health` fuera del prefijo global
Sería adaptar el sistema a su descripción equivocada. **`main.ts` no se toca.**

### Reescribir `CLAUDE.md`
Sólo la fila 138. Es instrucción vinculante para todo agente futuro; cualquier otro cambio ahí es
una conversación aparte.

### Corregir afirmaciones que el barrido encuentre y no sean contrastables
Si el barrido (PT-130.1) topa con algo dudoso pero no verificable mecánicamente, **se registra**, no
se corrige a ojo. Corregir por intuición es cómo se llega a un documento que miente con confianza.

### Reescribir `coherencia-deuda-tecnica.spec.ts`
Se **revisa** su cláusula de escape (PT-130.7) y se decide. No se reescribe ni se amplía su alcance.

---

## Se registra pero no se resuelve

| Observación | Dónde va |
|---|---|
| Una afirmación **sin cita** no es verificable y la guarda no la mira | Limitación declarada en `spec-changes.md`. Quien quiera protección, que cite |
| `09-Security-Architecture.md` podría no tener ninguna afirmación contrastable | Se anota en la salida de la guarda: cero cobertura **dicha**, no aparentada |
| `docs-v2/` mantiene su propio corpus, fuera de todo esto | `HANDOFF.md`. Dos corpus documentales conviviendo es un riesgo estructural, y merece su propio PT |
| Que `docs/` haya dejado de estar gitignored abre la puerta a más guardas | **Sí se aprovecha**: es D3 y la tarea .7 |

---

## Criterio de crecimiento

- **Es una afirmación contrastable y falsa en uno de los cinco documentos** → entra.
- **Cualquier otra cosa** → se registra y no se arrastra.

El barrido puede sacar más casos de los tres conocidos. Los que sean contrastables se corrigen; el
resto se anota. **Lo que este PT no hace es crecer hasta convertirse en una revisión documental
completa** — eso está declarado como pendiente en `PTSA/PENDIENTES.md` § S-002.7.

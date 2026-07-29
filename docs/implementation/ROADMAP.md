# ROADMAP — FPGE

**Estado: RETIRADO como documento vivo el 2026-07-29 (PT-140).**
La emisión anterior —R-001, del **2026-06-23**— se conserva en
`archive/ROADMAP-R-001-2026-06-23.md`.

---

## Por qué se retira en vez de regenerarlo

El roadmap que había declaraba:

```
Health: 86.1 / 100   →  Clase C (cap freshness UNKNOWN)
Risk:   100 / 100    →  CRÍTICO
D1:     70           →  2 ALTAS
```

Hoy el sistema está en **Clase A, Health 95.5, Risk 24, con un solo hallazgo activo** (H-005). Ese
documento llevaba cinco semanas diciendo algo que había dejado de ser cierto, y **un roadmap obsoleto
es peor que ninguno: se lee con confianza**. Es la misma forma que H-016.

**FPGE no se había vuelto a ejecutar nunca** desde S-001. Y ésa es la causa mecánica de lo que el
humano preguntó al abrir PT-140 —*«siempre quedan cosas por hacer y nunca se cierran completo»*—: el
bucle `FDGE → PTSA → FPGE → FDGE` estaba roto en su tercer eslabón. Nadie decidía qué seguía; se iba
haciendo lo que aparecía.

## Por qué retirarlo y no regenerarlo ahora

FPGE prioriza **a partir de evidencia**: hallazgos PTSA activos, tendencias de `score-history.json`,
recomendaciones de `HANDOFF`. Hoy hay **un** hallazgo activo, y es una decisión de negocio que ningún
PT puede resolver. Priorizar una lista de uno es teatro.

Lo que sí queda pendiente está en `docs/implementation/PENDING_TASKS.md` § 1, que es corto y honesto:
PT-141, TD-016, F-136-A y cinco menores.

## Cuándo volver a emitirlo

Cuando haya de qué priorizar — es decir, **después del próximo `resume PTSA`**. Esa corrida
recalculará freshness y los scores, que hoy están desfasados: `ESTADO_ACTUAL.md` cita 666 unitarias
del API y hoy son 777 en total. Con hallazgos nuevos sobre la mesa, `[START FPGE]` vuelve a tener
sentido.

**Retirarlo es una decisión, no un olvido**, y por eso está escrita aquí en vez de dejarse el fichero
anterior pudriéndose.

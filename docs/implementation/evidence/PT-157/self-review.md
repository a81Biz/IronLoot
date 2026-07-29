# PT-154 / PT-157 — Self-Review

- [x] Tests-first: la guarda se vio fallar en RED por los dos motivos de H-024 (rutas y migraciones)
      antes de tocar `audit-scope.yaml`.
- [x] Los dos sentidos, y en PT-154 **tres**: no reaparecen · siguen archivados · el contrato sigue.
- [x] **RULE-28 y RULE-29 escritas en `11-Conventions.md`.** Sin eso, RULE-27 —la guarda que escribí
      ayer— habría acusado a este PT de citar reglas inexistentes. Funcionó.
- [x] La guarda ignora globs a propósito: `src/**/*.ts` es un patrón, no una cita.
- [x] Suite completa 805/805.

## Lo que hice mal y corrigió la guarda

**Corregí una de las dos listas y di el trabajo por hecho.** La guarda siguió en rojo y señaló la
segunda, en `auditable_patterns`. Si hubiera corregido a mano sin escribir el mecanismo primero, el
fichero habría quedado mintiendo en otro sitio y yo lo habría reportado como cerrado.

Es exactamente el defecto que el PT venía a arreglar, cometido dentro del PT que lo arregla.

## Lo que no cubre

`C2` sólo compara **el número** de migraciones, no la prosa que lo rodea. Una guarda que exija
redactar de cierta forma enseña a escribir para el linter, y entonces el documento deja de decir la
verdad. Es la misma decisión que tomó `coherencia-de-registros.spec.ts` en PT-140, y por el mismo
motivo.

## Estado

`VALIDATION_PENDING`. **H-024 → `CORREGIDA`**, no cerrada (`[R44]`).

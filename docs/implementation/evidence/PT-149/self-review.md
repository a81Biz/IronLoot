# PT-149 / PT-153 — Self-Review

- [x] **Tests-first real.** `veredicto-de-coherencia.spec.ts` se escribió y se vio fallar en RED
      (`TS2305: has no exported member 'veredictoCoherencia'`) antes de tocar el script.
- [x] **Los dos sentidos** (RULE-14): con base alcanzable y sin ella, con el código de salida
      comprobado en ambos.
- [x] Comportamiento preservado: `rubric_compliance_score` sigue dando 100 sobre las 7 reglas
      medibles, idéntico a la medición del host en S-003.
- [x] Suite completa 792/792 en 103 suites.
- [x] Sin artefactos de depuración. Comprobado con `git status`, no sólo buscando `console.log`.
- [x] `$queryRawUnsafe` justificado en el código: el SQL es **literal en el fichero**, sin entrada de
      usuario en ningún punto. Mismo criterio que `observability-check.ts`.

## Lo que no está limpio

**No hay prueba automática del código de salida.** La contraprueba de `exit 1` se hizo a mano contra
el contenedor y está en la evidencia, pero ninguna suite la ejecuta. Automatizarla exige levantar el
script como subproceso con `DATABASE_URL` envenenada — factible, y no lo hice. Queda anotado: si
mañana alguien vuelve a poner un `return` donde va un `process.exit(1)`, **las 792 seguirían en
verde**.

Es el mismo tipo de hueco que este PT vino a cerrar, y prefiero decirlo a que se descubra solo.

## Estado

`VALIDATION_PENDING`. Son BUG y REFACTOR: el agente no cierra bugs.
**H-021 y H-022 pasan a `CORREGIDA`, no a `CERRADA`** — `[R44]`.

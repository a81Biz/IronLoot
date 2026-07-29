# PT-141 — Self-Review (STATE 5)

## Checklist

- [x] **Alcance del `REFACTOR_SCOPE`** — lo que cambia: qué documentación manda y a dónde apuntan las
      citas. Lo que **no** cambia: el contenido de `docs-v2/`, las reglas en sí, ni una sola línea de
      lógica de negocio. Se respetó: el único código tocado son dos guardas (una ruta y una raíz).
- [x] **Barra de calidad** — «cero rutas citadas en `CLAUDE.md` que no existan». Medido: 0.
- [x] **Riesgo de regresión** — la obligación de consultar arquitectura antes de tocar código.
      Preservada y reforzada: «No Architecture Blindness» ahora nombra los cuatro sitios concretos y
      dice explícitamente que ADR-049 movió dónde viven, no relajó la obligación.
- [x] Reglas de `11-Conventions.md` respetadas. RULE-14 (una guarda que nadie ha visto fallar no es
      una guarda): RULE-27 tiene seis casos de control y se vio fallar en su primera ejecución.
- [x] Commits atómicos, cinco, todos `PT-141`, con `git mv` para conservar la historia de los nueve.
- [x] Tests-first en la parte que lleva guarda: `bd3d634` (RED) → `9d74cb1` (GREEN).
- [x] Sin artefactos de depuración. **Comprobado explícitamente con `git status` y revisando el
      diff de ficheros nuevos**, no sólo buscando `console.log` — es lo que se me escapó en PT-143,
      donde dejé un `diag.cjs` en `src/api/src/`.
- [x] Documentación actualizada: ADR-049, dos README, `11-Conventions.md`, `10-Technical-Debt.md`,
      `CLAUDE.md`.

## Lo que no está limpio, y por qué

**El orden tests-first no se cumplió del todo.** Escribí RULE-25 y RULE-26 en `11-Conventions.md`
**antes** de escribir la guarda RULE-27. El hallazgo sí precedió a ambos —la ausencia se midió con
`grep` y está en la evidencia—, pero la guarda no llegó a verse fallar *por ese motivo concreto*: se
vio fallar por sus propias citas. Lo digo porque la alternativa es que parezca RED→GREEN limpio y no
lo fue.

**Los tres commits de documentación pura no llevan guarda que los verifique.** ADR-049, los README y
el mapa de archivado son prosa: nada comprueba que el mapa sea correcto salvo el inventario que lo
sostiene, que lo escribí yo. Lo que sí está verificado mecánicamente es lo que importaba más — que
ninguna ruta citada apunte al vacío, y que las nueve citas del TRD sigan ciertas desde `archive/`.

**Las referencias históricas a `01`…`09` desde `PTSA/` y `changes/` quedan apuntando a la ruta
antigua.** No se reescriben: son registros append-only y la inmutabilidad auditable (`[A6]`) lo
prohíbe. Por eso los ficheros se archivan y no se borran, y por eso `archive/README.md` lo dice
explícitamente. Un lector que siga una de esas citas encuentra el fichero un directorio más abajo.

## Lo que este PT no cierra

- **PT-141.B** — `[START FOUNDATION]`. Sus cuatro prerrequisitos están cerrados y el protocolo ya
  está acotado a lo que debe generar. Es decisión del humano cuándo ejecutarlo.
- **F-136-A** — 79 de 162 ficheros de evidencia sin seguir por git.
- **TD-016** — escáner de vulnerabilidades de imagen base.
- **H-005** — quién emite la factura. Es una decisión de negocio; ningún PT la resuelve.

## Estado

`VALIDATION_PENDING`. Es un REFACTOR y la barra de calidad se cumple, pero **toca una decisión
estructural sobre qué documentación manda**, y eso lo valida una persona. El agente no cierra esto.

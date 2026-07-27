# PT-103 — Self-Review

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-103-registro-de-deuda-desincronizado` ·
**Estado**: VALIDATION_PENDING

## Checklist FDGE STATE 5

- [x] **¿Criterios de aceptación verificados?** Los seis de `PLAN_ACTUAL.md` §6.
- [x] **¿Escenarios del Proposal Package pasando?** CD-01…CD-06, 6/6.
- [x] **¿Efectos colaterales?** Ninguno de código: el cambio es documentación más un test de
      lectura. `npm test` completo: **703** (API 458 → 464).
- [x] **¿Reglas de `11-Conventions.md` respetadas?** Y ampliadas: RULE-08 nace de este PT.
- [x] **¿Commit atómico y trazable?** Sí.
- [x] **¿Sin artefactos de depuración?** Sí.
- [x] **¿Documentación actualizada?** El registro, `PENDING_TASKS.md`, `11-Conventions.md`.

## La guarda hizo su trabajo antes incluso de existir del todo

En RED nombró exactamente las cuatro:

```
TD-003: HISTORY.log la da por cerrada, el registro dice "Open. **Reescrita por PT-090**…"
TD-005: HISTORY.log la da por cerrada, el registro dice "Acknowledged known trade-off."
TD-010: HISTORY.log la da por cerrada, el registro dice "Open. Descubierta en PT-088."
TD-012: HISTORY.log la da por cerrada, el registro dice "Open. Descubierta en PT-089."
```

## Lo que apareció al comprobar contra el código, que era el punto

El plan exigía verificar cada cierre **en el código** y no copiar lo que decía `HISTORY.log`. Esa
disciplina produjo dos cosas que no estaban previstas:

1. **TD-005 no estaba del todo cerrada.** PT-096 retiró `'unsafe-inline'` de `scriptSrc` —su
   objetivo, y el riesgo grande— pero `styleSrc` lo conserva en los tres sitios. Declararla
   «cerrada» a secas habría sido la misma imprecisión que causó F-33, una semana después de
   corregirla. Se cierra **acotada a `script-src`** y el resto se registra como **TD-014**.
2. **`PENDING_TASKS.md` llevaba nueve trabajos como `PENDING` que ya estaban hechos.** El mismo
   desfase de F-33, en otro fichero. Alineado.

## Un tropiezo que merece constar

Escribí la guarda en `src/api/test/unit/docs/`. `git add` la rechazó: el `.gitignore` tiene un
`docs/` **global**, así que cualquier carpeta con ese nombre, a cualquier profundidad, queda fuera
del repositorio. El test habría existido solo en mi máquina — una guarda invisible, que es
justamente la enfermedad que este PT trata. Movida a `test/unit/documentacion/`.

## Los límites de esta guarda, dichos claramente

| Limitación | Por qué se acepta |
|---|---|
| **No corre en CI ni en un clon limpio** (`docs/` está gitignored) | Exigir los ficheros rompería la suite de todos por algo que no es un defecto. Protege a quien tiene los documentos — que es quien puede desincronizarlos |
| **Sólo reconoce formas explícitas** de «cerrada» y «abierta» | Un falso positivo termina con la guarda borrada, y se pierde también lo que sí protegía. Se prefiere dejar pasar una incoherencia rara |
| **No comprueba que el cierre sea cierto** | Eso lo hace una persona leyendo el código. La guarda sólo impide que los dos documentos se contradigan |

No es una red completa. Es la red que faltaba en el sitio por donde se cayó dos veces.

## Lo que este PT desbloquea

**PT-090** deja de estar bloqueado por F-33: el defecto que existía para corregir ya no está en el
fichero que vino a corregir. Validarlo es del humano.

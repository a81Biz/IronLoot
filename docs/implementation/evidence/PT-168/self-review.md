# PT-168 — Self-Review (STATE 5)

**Fecha**: 2026-07-29 · **Tipo**: BUG · **Complejidad**: STANDARD
**Hallazgos que cierra**: F-167-A, F-167-B

## Qué se hizo

Los tres derivados de PTSA declaraban activos cuatro hallazgos `CERRADA`, y la frescura decía
`commits_since_audit = 0` con 25 commits desde la medición.

| Fichero | Antes | Después |
|---|---|---|
| `PTSA/ESTADO_ACTUAL.md` | «Hallazgos activos: **5**» · «Cerrados: 20» · `FRESH`, 0 commits | «Hallazgos activos: **1**» · «Cerrados: 23» · `STALE`, **25** commits desde `d260c80` |
| `PTSA/RESUMEN.md` | D2 = 80 imputado a H-021/H-022 · D4 = 94 a H-023/H-024 | columna «Penaliza hoy» = «penalización retirada»; atribución histórica en prosa |
| `PTSA/PENDIENTES.md` | H-021/022/023/024 en «Lo abierto de peso» | sólo H-005 y el `resume PTSA` pendiente |

## Evidencia

| Fichero | Qué prueba |
|---|---|
| `guarda-RED.txt` | La guarda **vista fallar** antes del arreglo: 4 fallos (C1…C4), 7 controles en verde |
| `guarda-GREEN.txt` | Después: **13/13**, incluidos los 8 casos de control |
| `guardas-documentacion.txt` | Las 9 guardas de documentación tras el cambio |
| `verificacion-hallazgos-s003.txt` | Los cuatro cierres de S-003 **ejecutados**, no leídos |

## La decisión que más importa, y por qué se tomó así

**No se recalculó el Health.** La aritmética daría D2 = 100, D4 = 100, `Risk_bruto = 6`. Escribirlo
sería una *emisión* de PTSA, y `CLAUDE.md` prohíbe la auto-activación: `resume PTSA` es del humano.
Afirmar un score que ningún instrumento emitió es **H-021 exactamente** — el hallazgo que este mismo
fichero registró — así que se declara «SUPERADO, pendiente de recálculo» y se deja el cálculo a la
vista para que el delta sync lo confirme o lo corrija.

## Un falso positivo encontrado por el camino, y corregido

La primera versión de la guarda acusaba **su propia prosa explicativa**: la sección de activos dice
legítimamente «Cerrados: 23 (H-001 … H-024)». Se arregló mirando **filas de tabla, no prosa**
(`filasDeTabla`), y se fijó en **AC-07**, que comprueba las dos direcciones: que la prosa no se acuse y
que sin el filtro sí habría fallado. Un falso positivo mata un control igual que un punto ciego.

## Checklist

- [x] Criterios de PLAN_ACTUAL § 1 verificados (1 activo / 23 cerrados / frescura real)
- [x] Guarda **vista fallar** antes de arreglar (RULE-14) — `guarda-RED.txt`
- [x] Casos de control en los dos sentidos (8), incluido el falso positivo real
- [x] `11-Conventions.md` — RULE-33 declarada, con su Delta Log
- [x] Guarda añadida a `test:guardas` (RULE-32 la vigila)
- [x] No se tocó ningún `H-XXX`, ni `AUDIT_LOG.md`, ni `score-history.json` (append-only / `[A6]`)
- [x] Sin artefactos de depuración
- [x] Commit atómico y trazable a PT-168

## Lo que queda fuera, dicho explícitamente

- **Un `resume PTSA`** que recalcule y emita. Sólo lo dispara el humano.
- **H-005** sigue `ABIERTA`: PAC + decisión fiscal.
- El **Delta Log** de `11-Conventions.md` sólo registra hasta RULE-14 más mi fila; las reglas 15–32
  nunca se anotaron ahí. **No se rellena en este PT** —sería inventar fechas y PT de origen que habría
  que verificar uno a uno— y se deja anotado como observación, no como pendiente.

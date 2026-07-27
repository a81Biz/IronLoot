# Self-Review — PT-090

## Protocolo

| Estado | Cumplido |
|---|---|
| STATE 1-B Discovery | Sí — `DISCOVERY.md` § PT-090, cada afirmación con fichero y línea |
| STATE 2 Estrategia | Sí — `PLAN_ACTUAL.md` reescrito para este PT |
| STATE 3 Proposal Package | Sí — `changes/PT-090-registro-desincronizado/` |
| Proposal Gate | **ACK delegado** por el desarrollador para toda la matriz |
| STATE 4 rama propia | Sí — `fix/PT-090-registro-desincronizado` |
| STATE 4 tests RED | **No aplica**: no toca código. Se verificó que `src/` quedó intacto |
| STATE 5 Evidencia | Sí |
| STATE 6 | `VALIDATION_PENDING` |
| STATE 7 | Al cerrar |

Es el primer PT de esta serie que recorre el ciclo **en orden**, que era el encargo.

## Criterios de éxito

- [x] Ninguna afirmación del registro contradice al código — comprobadas una a una
- [x] TD-007 cerrada citando `users.service.spec.ts:313,325,335`
- [x] H-006 cerrada con medición (11 `credentials: 'include'`, 0 `localStorage`)
- [x] TD-003 y TD-004 **reescritas, no cerradas**, apuntando a PT-092 y PT-093
- [x] `PENDING_TASKS.md` reconstruido; el anterior en `archive/`
- [x] ROADMAP reconciliado y declarado caducado
- [x] Seis evidencias reconstruidas, **marcadas como tales**
- [x] Tabla duplicada de PT-035 eliminada
- [x] Suites intactas: 60/406 y 8/134. Cero cambios en `src/`

## Hallazgo generado

**F-25 — la puja en vivo no llega al navegador.** Entró en la matriz como **PT-098**, posición #2.

De dónde salió: H-006 llevaba **34 días abierta** preguntando exactamente por esa zona. La
respuesta costaba dos `grep`. El coste de no responder una investigación no es la investigación:
es lo que tapa.

## Decisión discutible, declarada

**Reconstruir evidencia a posteriori** es inferior a capturarla en su momento, y no lo disimula:
cada fichero lo dice en su primera línea y enumera lo que **no** puede reconstruirse. La
alternativa —dejar seis PT sin evidencia— incumple FDGE en silencio; esta al menos es auditable.

## Lo que NO arregla, a propósito

`isVerified` muerto (**PT-092**) y el segundo factor opcional del admin (**PT-093**). Corregirlos
dentro de un PT de registro habría dejado un cambio en el camino del dinero sin su propio ciclo.

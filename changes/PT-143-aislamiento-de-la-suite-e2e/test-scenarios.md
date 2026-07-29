# PT-143 — Escenarios de prueba

## La guarda: limpiezas acotadas

| # | Escenario | Esperado |
|---|---|---|
| AC-01 | **RED** sobre la suite actual | **Falla**, listando las 11 de `orders-flow.e2e-spec.ts` |
| AC-02 | **GREEN** tras acotarlas | Pasa |
| AC-03 | Control — `deleteMany()` sin argumento | **Falla** |
| AC-04 | Control — `deleteMany({ where: {...} })` | Pasa |
| AC-05 | Control — `deleteMany({})` | **Falla.** Es el mismo borrado con dos llaves de disfraz |
| AC-06 | Control — `deleteMany` fuera de `test/` | No se mira: `src/` tiene otras reglas |

## La suite, en paralelo y contra base vacía

| # | Escenario | Esperado |
|---|---|---|
| P-01 | 18 ficheros e2e, Jest en paralelo | **82/82** |
| P-02 | Segunda corrida seguida | **Mismo resultado.** Un aislamiento que funciona una vez no es aislamiento |
| P-03 | `ratings.e2e` aislado | Pasa |
| P-04 | `orders-flow.e2e` aislado | Pasa — acotar su limpieza no puede romperla |
| P-05 | Violaciones de clave ajena | **Cero** |

## Lo que desbloquea

| # | Job | Esperado |
|---|---|---|
| CI-01 | `test-integration` | Verde |
| CI-02 | `build` | **Se ejecuta por primera vez** |
| CI-03 | `docker` | Ídem |

> Que pasen es otra cosa. Si fallan, se trian con la regla de PT-136.

## Regresión

| # | Suite | Línea base |
|---|---|---|
| REG-01 | Unitarias | **713** + la guarda nueva |
| REG-02 | e2e | **82** |
| REG-03 | Navegador | 176 |

## Lo que NO se prueba aquí

- El contrato real de las pasarelas. Vive en la suite de navegador, que cobra de verdad (PT-134).
- Rendimiento de la suite. Se busca aislamiento, no velocidad.

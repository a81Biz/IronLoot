# PLAN_ACTUAL — PT-120: Domain Rules as Code (checkpoint D1.N1)

**Fecha**: 2026-07-27 · **Tipo**: FEATURE · **Complejidad**: STANDARD · **Estado**: STATE 2
**Entrada**: `DISCOVERY.md` § PT-120 · `[R57]` · `audit-scope.yaml`

---

## 1. Objetivo

Que las reglas de dominio de F-1 se puedan **volver a verificar sin reescribir el guion**.

Hoy se han verificado tres veces —DS-004, DS-006, DS-008— con guiones que viven en una carpeta
temporal y se pierden. Cada delta sync rehace el mismo trabajo, y el próximo también.

## 2. Solución propuesta

### 2.1 Un catálogo, no un script

Las reglas se declaran como **datos**: identificador, enunciado, peso, y la consulta que las decide.

```
{ id: 'CR-001', enunciado: '…', peso: 20, sql: '…', esperado: '0' }
```

Añadir una regla es añadir una entrada, no tocar el motor. Es lo que permite que F12 amplíe el
catálogo sin que nadie reescriba nada.

### 2.2 El motor separa «no cumple» de «no hay datos»

Tres veredictos, no dos: `CUMPLE`, `VIOLADA`, `SIN_DATOS`.

Un catálogo que devuelve «cumple» sobre una base vacía es peor que no tenerlo — es la misma familia
que un `catch` mudo. Si no hay productos que evaluar, hay que decirlo.

### 2.3 El score se calcula

`rubric_compliance_score = round(100 × Σpeso(cumplidas) / Σpeso(aplicables))`, con las `SIN_DATOS`
**fuera del denominador**: no se puede puntuar lo que no se ha podido mirar.

En DS-008 ese número lo calculé a mano. Un número de auditoría transcrito a mano es un número que
nadie puede reproducir.

### 2.4 Nivel 3 aparte

La coherencia inter-producto va en el mismo comando pero en su propio bloque, y **no entra en el
score de rúbrica**: son dos métricas distintas de `[R38]` y mezclarlas las hace ilegibles.

## 3. Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Tests de Jest** | Se ejecutan contra la BD de desarrollo y son lentos de leer como informe. Además, un fallo de dominio no es un fallo de test: es un hallazgo, y quiere salida legible |
| **Dejarlo como guiones sueltos** | Es lo que hay, y es lo que ha hecho repetir el trabajo tres veces |
| **Reglas embebidas en el motor** | Añadir una regla obligaría a tocar código; F12 amplía el catálogo, y debe poder hacerlo sin eso |
| **Un servicio o dashboard** | Desproporcionado. Un comando que se puede correr y pegar en una evidencia basta |

## 4. Análisis de regresión

| Qué | Riesgo | Cómo se comprueba |
|---|---|---|
| **Que el catálogo mienta** | Una consulta mal escrita da verde sobre un sistema roto | Cada regla lleva un **caso de control**: se inyecta la violación y debe fallar |
| Falsos positivos | Una regla demasiado estricta acaba con el checkpoint desactivado | Se derivan de F-1, no se inventan |
| BD vacía | Que diga «cumple» | `SIN_DATOS` explícito y fuera del denominador |
| El resto del sistema | Ninguno: sólo lee | — |

## 5. Criterios de éxito

1. `npm run audit:domain` ejecuta el catálogo y calcula el score.
2. Con la BD actual: mismo resultado que DS-008 (`rubric = 100`), **reproducido, no transcrito**.
3. Con una violación inyectada: **falla nombrando la regla**.
4. Con BD vacía: `SIN_DATOS`, no `CUMPLE`.
5. Añadir una regla no toca el motor.
6. Código de salida ≠ 0 si hay violación — comprobado **sin tubería** (la lección de PT-118).

## 6. Restricciones

- Tests en RED antes (RULE-06).
- Las reglas se derivan de F-1: no se inventan ni se relajan.
- El score se **calcula**; ninguna cifra de auditoría se transcribe a mano.

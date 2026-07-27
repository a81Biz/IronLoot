# PLAN_ACTUAL — PT-118: el checkpoint D2 de dependencias

**Fecha**: 2026-07-27 · **Tipo**: FEATURE · **Complejidad**: STANDARD · **Estado**: STATE 2
**Entrada**: `DISCOVERY.md` § PT-118 · PTSA H-008 · `audit-scope.yaml`

---

## 1. Objetivo

Que una vulnerabilidad **nueva** en dependencias de producción rompa el CI el día que aparece, no
treinta y cuatro días después.

## 2. Solución propuesta

### 2.1 Línea base versionada

Un fichero `src/api/security-baseline.json` con los avisos **ya triados**: paquete, severidad, y por
qué siguen ahí. Vive en el repositorio, con fecha.

```json
{
  "generado": "2026-07-27",
  "motivo": "TD-015 — exigen saltos de version mayor sobre Express o @nestjs/core",
  "avisos": { "tar": "critical", "glob": "high", … }
}
```

### 2.2 El script compara, no cuenta

`npm audit --omit=dev --json` → se comparan **paquete y severidad** contra la línea base:

| Situación | Resultado |
|---|---|
| Paquete nuevo con aviso | **Falla**, y lo nombra |
| Paquete de la base que sube de severidad | **Falla** |
| Paquete de la base igual | Pasa |
| Paquete de la base que desaparece | Pasa, y sugiere reducir la base |

Contar avisos no sirve: 27 hoy y 27 mañana puede significar que uno se arregló y entró otro.

### 2.3 Un paso en el CI

Job propio en `ci.yml`, después de `lint`. Y un script `npm run audit:check` para poder correrlo a
mano — un control que sólo existe en el CI no se usa mientras se programa.

## 3. Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **`npm audit --audit-level=high` a secas** | Fallaría desde el primer día por las 27 ya triadas. Quedaría rojo permanente y alguien lo desactivaría — que es exactamente cómo muere un control |
| **Umbral numérico** («no más de 27») | 27 hoy y 27 mañana puede ser un arreglo y una entrada nueva. Mide la cifra, no el riesgo |
| **`npm audit fix` automático en CI** | Cambiar dependencias sin que nadie lo mire, en un servidor de pagos |
| **Un servicio externo** (Snyk, Dependabot) | Mejor a largo plazo, pero exige cuenta y configuración fuera del repositorio. Esto funciona hoy y sin dependencias |

## 4. Análisis de regresión

| Qué | Riesgo | Cómo se comprueba |
|---|---|---|
| **El CI se pone rojo de golpe** | Si la línea base no cubre las 27, el primer commit falla | Se genera **de** la salida real y se prueba en verde antes de commitear |
| Que la base se quede obsoleta | Un aviso arreglado sigue listado y nadie lo quita | El script lo dice cuando sobra |
| Ruido tras un `npm install` | Que el árbol cambie y aparezcan avisos transitivos nuevos | Es el comportamiento deseado: **eso es exactamente lo que debe avisar** |
| Tiempo del CI | Que se alargue | `npm audit` sobre el árbol ya instalado: segundos |

## 5. Criterios de éxito

1. Con el estado actual (27 avisos, todos en base) → **pasa**.
2. Con un aviso inventado fuera de base → **falla, nombrándolo**.
3. Con un aviso de base subido de severidad → **falla**.
4. `npm run audit:check` corre en local.
5. El job aparece en `ci.yml`.
6. El mensaje se entiende **sin abrir el JSON**.

## 6. Restricciones

- Tests en RED antes (RULE-06).
- La línea base se genera **de la salida real**, no a mano.
- No se arregla ninguna de las 27: eso es PT-119.

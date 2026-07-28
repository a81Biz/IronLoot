# PT-136 — Fuera de alcance

## Explícitamente excluido

| # | Qué | Por qué | Dónde va |
|---|---|---|---|
| 1 | **Poner los ocho jobs en verde** | Si un test real falla, el defecto es del repositorio, no del pipeline. Mezclarlo haría imposible saber qué arregló qué — y es literalmente lo que PT-128 decidió al encontrarse 42 tests rojos | PT propio por cada defecto, abierto en PT-136.5 |
| 2 | **Reorganizar los `needs`** | La topología actual la decidió PT-128 con su razón escrita (H-015). Lo que faltaba no era la topología | — |
| 3 | **Jobs nuevos** | Escáner de imagen base | **TD-016** |
| 4 | **Un flujo de ramas por entornos** (`dev`/`qa`/`prep`/`prod`) | Este PT retira esos nombres precisamente porque nadie los creó. Adoptarlos de verdad es una decisión de plataforma | ADR propio, el día que se quiera |
| 5 | **Cachés, matrices de versiones, paralelización** | Optimizar un pipeline que aún no ha corrido nunca es optimizar lo desconocido | Después de tener datos de duración real |
| 6 | **Corregir el resto de incoherencias de `PENDING_TASKS.md`** | Son diez y son sistémicas | **PT-140** |
| 7 | **Que las ocho guardas que leen la raíz corran en el contenedor** | Son verdes en CI —que es donde este PT las lleva— y rojas dentro del contenedor de desarrollo | **PT-138** |
| 8 | **Ramas protegidas, revisiones obligatorias, checks requeridos en `master`** | Es política de repositorio, no reparación de un defecto. Y no se pide antes de saber cuánto tarda la corrida | Decisión del humano, después |

## Lo que sí entra aunque parezca de otro

- **La cuenta de jobs en la documentación** (siete → ocho): la deja obsoleta este PT y son dos líneas.
- **El criterio 10 de PT-135**: no se puede cerrar sin esto, y cerrarlo aquí es lo honesto —
  `HANDOFF.md` lleva pidiendo algo imposible.
- **Los defectos del propio job** que salgan en el triaje: son el alcance, no una excepción.

## Deuda que este PT NO deja

**Cero deuda diferida.** Todo lo que el triaje destape se resuelve dentro (si es del job) o se abre
como PT con su entrada en `DISCOVERY.md` (si no lo es). *«Registrado para más adelante»* no es una
salida disponible — es lo que convirtió H-014 en un hallazgo que volvió en cuatro días.

## Riesgo aceptado explícitamente

**La primera corrida saldrá roja, y se acepta.** Un pipeline rojo y visible es el objetivo de este PT;
un pipeline verde conseguido silenciando algo sería su fracaso.

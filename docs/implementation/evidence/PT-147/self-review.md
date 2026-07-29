# PT-147 — Self-Review

**Fecha**: 2026-07-29 · **Rama**: `fix/PT-147-imagenes-que-se-construyen` ·
**Estado**: `VALIDATION_PENDING`. Es un BUG: **lo cierra el humano.**

## Lo que consigue

**Los ocho jobs de CI se ejecutan y terminan en verde.** Las cuatro imágenes de producción se
construyen y **arrancan**, y las migraciones las aplica la propia imagen del API.

Hace unas horas el contador de ejecuciones de este repositorio era `0`.

## Criterios de éxito

| # | Criterio | Estado |
|---|---|---|
| 1 | La guarda falla antes y pasa después | ✅ Acusó `./Dockerfile` |
| 2 | Las cuatro imágenes, con su contexto | ✅ Construyen a la primera |
| 3 | Los tres SSR llegan a `healthy` | ✅ |
| 4 | El API llega a `healthy` | ✅ tras tres vueltas de triaje |
| 5 | Al menos una construcción sin caché | ✅ la del API |
| 6 | Triaje de lo que salga | ✅ tres paradas, las tres defecto del job |
| 7 | Casos de control | ✅ seis |
| 8 | Regresión | ✅ 738/738 · 86/86 e2e |

## Lo que encontré, y no es poco

Las cuatro imágenes **construyeron a la primera**. Lo que costó tres vueltas fue que **arrancaran**,
que es literalmente el argumento de H-017.

Y las tres paradas enseñaron cosas distintas: una reserva de Redis escrita para la red de compose
(F-135-A), el control de arranque de PT-036/PT-093 **funcionando por primera vez dentro de una
imagen**, y que la imagen no migra sola —a propósito—.

**Ninguna se habría visto sin arrancar.**

## Lo que hay que decir de mí mismo

Tres de las tres paradas fueron **variables que no le di al contenedor**. No son defectos del
producto: son mi job incompleto. La regla de triaje de PT-136 sirvió para no confundirlo, pero
conviene no adornarlo: **el job estuvo mal escrito tres veces seguidas**, y lo que lo hizo llevadero
fue haber puesto el volcado de log desde el principio.

## Lo que NO hice, a propósito

- **No toqué ningún `Dockerfile`.** Los creó PT-129 y arrancaban; lo que faltaba era que CI lo
  comprobara.
- **No publico imágenes** (`push: false`).
- **No añadí escáner de la imagen base** → sigue siendo **TD-016**, y ahora que las imágenes se
  construyen en CI es más fácil de cerrar.
- **No incluí `nginx`**: probarlo de verdad exige tener detrás los cuatro.

## Lista de STATE 5

- [x] Criterios verificados, los ocho
- [x] Sin efectos colaterales: 738/738, `lint` 0 errores
- [x] **RULE-26** y su guarda con seis casos de control
- [x] Commits atómicos trazables a PT-147
- [x] Sin artefactos de depuración — comprobado buscando ficheros nuevos
- [x] Evidencia en `.md` (F-136-A)

## Lo que falta para cerrarlo

1. **El VoBo humano.** Es un BUG.
2. **TD-016** sigue abierta: nada comprueba vulnerabilidades de la imagen base.

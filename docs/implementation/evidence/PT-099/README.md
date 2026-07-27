# Evidencia — PT-099 (F-26)

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-099-scripts-raiz`

## Lo que aparentaban y lo que cubrían

| Script de la raíz | Antes | Ahora |
|---|---|---|
| `npm test` | **448 tests** (solo API) | **653** — API 448 + CLIENT 71 + CORE 134 |
| `npm run typecheck` | solo API | los cuatro proyectos con TypeScript |
| `npm run lint:check` | solo API | los cinco |
| `npm run build` | solo API | los cinco |
| `postinstall` | **rompía `npm install` en cualquier workspace** | resuelve desde la raíz |

**205 tests omitidos.** Quien ejecutaba `npm test` —o un CI que lo llamara— creía haber probado
todo el proyecto.

Es la misma clase que TD-012 un nivel más arriba: un script que existe, funciona, y cubre menos
de lo que su nombre promete. Peor que fallar, porque **no avisa**.

## El `postinstall`

`src/apps/*` y `src/packages/*` son **workspaces npm**: `npm install` dentro de cualquiera de
ellos delega en la raíz, cuyo `postinstall` hacía `npm --prefix src/api install` con ruta
relativa, que no resuelve desde el workspace. Se descubrió al instalar eslint en PT-091 — hubo
que recurrir a `npm install --workspaces` desde la raíz.

## De paso

Cuatro proyectos no tenían script `typecheck`. Se añadió, porque un script de la raíz que
promete cubrirlos no puede apoyarse en algo que no existe.

## Verificado

```
npm test        448 + 71 + 134 = 653 tests, todos en verde
npm run typecheck  ejecuta en los cuatro
npm run lint:check ejecuta en los cinco
```

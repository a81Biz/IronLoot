# PT-236 — Self-Review

**Tipo:** REFACTOR (endurecimiento de guardas + inventario) · **Complejidad:** STANDARD · **Rama:** master
**Origen:** la revisión final de «que no falte nada». Al comprobar si los inventarios estaban al día
aparecieron **tres defectos encadenados**, y el tercero explica a los dos primeros.

## Lo que se encontró, en el orden en que se encontró

**1. `entities.md` tenía nueve líneas duplicadas.** Las cuatro filas de enums añadidas por PT-201 y su
nota explicativa aparecían **dos veces**. Accidente de edición. Retirado.

**2. Dos documentos citaban guardas con nombres que nunca han existido.**
`services.md` decía *«Lo vigila `inventario-de-servicios-completo.spec.ts`»* y `entities.md`
*«`inventario-de-entidades-completo.spec.ts`»*. La guarda existe y se llama
`inventarios-completos.spec.ts` — es **una sola** que cubre los seis inventarios.

**3. Y la razón de que 2 sobreviviera: `citas-de-fichero-existen.spec.ts` no miraba ni los
inventarios ni las citas sueltas.**

`CONTRATO` listaba seis documentos y **ninguno de los seis inventarios**, aunque `CLAUDE.md` los
declara parte del contrato de agente desde ADR-049. Y `RAICES` exigía que la cita empezara por `src/`,
`docs/`… mientras **este repositorio cita sus guardas por el nombre a secas**: `` `forma-de-lista-ssr.spec.ts` ``.

Medido: **254 citas sueltas sólo en el contrato, y 8 rotas.**

| Cita rota | Qué era |
|---|---|
| `rutas-que-el-client-invoca.spec.ts` **×3** | Renombrada a `rutas-que-los-ssr-invocan.spec.ts` en PT-148 |
| `inventario-de-servicios-completo.spec.ts` | Nunca existió → `inventarios-completos.spec.ts` |
| `inventario-de-entidades-completo.spec.ts` | Nunca existió → `inventarios-completos.spec.ts` |
| `deposit.js` | La fila describía una convención de JS por página que el repositorio **no usa** |
| `spec.ts` | Prosa genérica, no una cita → reescrita a `*.spec.ts` |
| `events.gateway.ts` | Citado **para decir que ya no existe** (PT-191) → declarado con su motivo |

**Las tres del nombre viejo son la tercera vez que `RULE-32` se rompe por su propio caso** — *«un
renombrado vacía una referencia sin dejar rastro»*—, y una de ellas estaba en `CLAUDE.md`.

## 4. Y al medir los inventarios apareció el más caro

**`services.md` documentaba 8 de los 21 servicios de ADMIN, con `C3` en verde.**

`C3` compara **nombres de clase** contra el documento entero. **18 de los 19 servicios de módulo de
ADMIN se llaman igual que uno del API**: `AuditService`, `CmsService`, `KycService`, `OrdersService`,
`UsersService`, `WithdrawalsService`… La fila del API satisfacía la comprobación del de ADMIN.

Es un falso **negativo** por medir por nombre — la otra cara del falso positivo que
`core-sin-superficie-huerfana.spec.ts` ya documenta, y **más caro, porque no se ve**. Trece servicios
podían faltar sin que nada protestara, y uno de ellos es el que se escribió **hoy** (`PT-216`).

Había además **dos** secciones de ADMIN con contenidos distintos. Fundidas: dos tablas para un mismo
alcance son dos respuestas a la misma pregunta.

## Lo que se cambió

| Fichero | Qué |
|---|---|
| `citas-de-fichero-existen.spec.ts` | Los seis inventarios entran en `CONTRATO`; las citas sueltas se resuelven por nombre contra el disco; `events.gateway.ts` declarado |
| `inventarios-completos.spec.ts` | `C3-bis`: un servicio de ADMIN sólo cuenta si lo nombra una sección cuyo encabezado diga `src/admin/src` |
| `services.md` | Sección de ADMIN completa: **21 de 21**, con su ruta |
| `entities.md` | Duplicado retirado |
| `CLAUDE.md`, `11-Conventions.md` | Las citas obsoletas y la fila de convención de JS por página |

## Verificación

**RED antes de implementar, dos veces y con nombres:** la guarda de citas listó las siete rotas; `C3-bis`
listó los trece servicios ausentes. Ninguna de las dos fue un fallo genérico.

**Casos de control en las dos direcciones**, que es lo que este repositorio exige:

- `AC-05` — hay **más de 150** citas sueltas leídas (sin esto, ensanchar el patrón y que no case daría
  verde por no medir) **y** un nombre inventado no está en `NOMBRES_REALES`.
- `AC-06` — `*.spec.ts` es una forma de nombre, no una cita. Por eso el texto se reescribió **en vez de
  ensanchar la excepción**: una guarda que se ensancha para no acusar deja de medir.
- `C3-bis` comprueba que la sección de ADMIN tiene contenido (>200 caracteres) y que se leyeron >15
  clases reales, antes de comparar.

**Verde:** 20/20 suites de documentación (**217** casos), **1.179** en el API, `tsc --noEmit` limpio.

## Checklist

- [x] Criterios verificados sobre el disco, no sobre lectura
- [x] Escenarios pasando; sin regresiones
- [x] Sin efectos colaterales — la ampliación de `RAICES` no toca las citas con ruta
- [x] `11-Conventions.md` respetado; `RULE-32` **reforzada**, no cambiada
- [x] Commit atómico trazable a PT-236
- [x] Sin artefactos de depuración
- [x] Documentación actualizada donde el código cambió el contrato

## Lo que este PT deja dicho

**Una guarda de citas que no mira la forma en que el repositorio cita, no es una guarda de citas.**
`RULE-32` existe desde PT-191 para contar que un renombrado vacía una referencia en silencio, y su
propia guarda dejaba pasar el caso más frecuente. Ocho citas rotas convivieron con ella en verde.

**Y medir por nombre falla en las dos direcciones.** `CLAUDE.md` ya avisaba de los falsos positivos
—«2 falsos positivos de medir por nombre»— y aquí apareció el falso negativo, que es peor: el positivo
hace ruido y se investiga; el negativo se lee como cobertura.

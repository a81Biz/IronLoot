# Evidencia — PT-101 (F-31)

**Fecha**: 2026-07-27 · **Rama**: `feature/PT-101-tests-admin`

## Lo que faltaba

| Proyecto | Antes | Ahora |
|---|---:|---:|
| `src/api` | 458 | 458 |
| `src/apps/client` | 83 | 83 |
| `src/packages/core` | 134 | 134 |
| `src/admin` | **0, sin infraestructura** | **13** |
| `src/apps/base` | **0, sin infraestructura** | **3** |
| **Total** | 675 | **691** |

F-31 hablaba sólo de ADMIN. Al medir apareció que **BASE estaba igual**. Dejarlo fuera habría
repetido el patrón que esta serie corrige: arreglar donde se observó, no donde vive.

## La decisión: qué NO se cubrió

ADMIN tiene 18 módulos y 2.839 líneas. Sus servicios llaman al API y renderizan: cubrirlos daría
18 suites comprobando que `fetch` fue llamado con la ruta correcta — código de prueba que **repite
la implementación en vez de fijar una conducta**. Cuando alguien cambie una ruta tendría que
cambiar el test, y el test no le habría dicho nada que el compilador no dijera.

Se cubrió lo que tiene **modo de fallo silencioso y consecuencia grave**:

- **`AdminAuthGuard`** — 14 líneas que deciden quién entra al panel que aprueba retiros.
- **`AdminApiClient`** — renueva el JWT y **cae a `X-Admin-Key`** si el login falla.

## Lo que los tests encontraron el primer día

**G-06**: el guardia usaba comprobación de veracidad (`!req.session?.isAdmin`), de modo que
`isAdmin: 'false'` —la **cadena**— **abría el panel**, porque una cadena no vacía es verdadera.

No era explotable: sólo el login escribe esa sesión, y escribe un booleano. Pero es la frontera de
seguridad del contexto de más privilegio, y la corrección era **una palabra**.

Se corrigió (`=== true`), y **se enmendó el plan explícitamente** — el §5 decía que este PT no
tocaría código de aplicación. Cambiar el alcance sin decirlo es lo que esta serie viene corrigiendo.

## Lo que fija `AdminApiClient`

El límite de la reserva. **A-06** comprueba que caer a `X-Admin-Key` ocurre **sólo** cuando el
login falla, y **no** cuando el JWT es válido pero la llamada devuelve 403. Si alguien ampliara
esa reserva sin querer, el panel pasaría a operar con una clave estática sin que nadie lo notara.

## Verificado

```
ADMIN   13/13      BASE   3/3
npm test en la raíz:  458 + 83 + 134 + 13 + 3 = 691
login del panel tras endurecer el guardia:  SESION OK
```

Los scripts de la raíz los incluyen: si tuvieran tests y no entraran ahí, se repetiría F-26 —un
script que aparenta una cobertura que no tiene—.

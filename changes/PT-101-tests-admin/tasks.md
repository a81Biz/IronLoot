# tasks — PT-101

| id | Objetivo | Validación | Estado |
|---|---|---|---|
| PT-101.1 | Jest en ADMIN, replicando la config de CLIENT | `npm test` corre | PENDING |
| PT-101.2 | Jest en BASE, ídem | `npm test` corre | PENDING |
| PT-101.3 | Tests de `AdminAuthGuard` | 5 casos, incluido el de sesión a medias | PENDING |
| PT-101.4 | Tests de `AdminApiClient` | reutiliza, renueva, y la reserva a `X-Admin-Key` | PENDING |
| PT-101.5 | `npm test` de la raíz los incluye | los cinco proyectos | PENDING |
| PT-101.6 | Nada se rompe | 675 + los nuevos; navegador 155/156 | PENDING |

## Lo que este PT NO hace, y por qué

Los 18 servicios de ADMIN. Son envoltorios de `fetch` sobre el API: cubrirlos produciría suites
que **repiten la implementación** en vez de fijar una conducta. Cuando alguien cambie una ruta,
tendría que cambiar el test, y el test no le habría dicho nada que el compilador no dijera.

No se fija umbral de cobertura: un número invita a escribir tests para el número.

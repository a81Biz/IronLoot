# test-scenarios — PT-101

## `AdminAuthGuard` — la frontera de seguridad

| # | Escenario | Esperado |
|---|---|---|
| G-01 | Sesión con `isAdmin: true` | deja pasar |
| G-02 | Sin sesión | **no** deja pasar |
| G-03 | Sesión presente pero **sin** `isAdmin` | **no** deja pasar — es el caso que un `if (req.session)` ingenuo dejaría entrar |
| G-04 | `isAdmin: false` explícito | **no** deja pasar |
| G-05 | Al rechazar | redirige a `/login`, no lanza — un panel que explota en vez de redirigir es peor experiencia y filtra que existe |

## `AdminApiClient` — el token y su reserva

| # | Escenario | Esperado |
|---|---|---|
| A-01 | Token vigente | lo reutiliza, no pide otro |
| A-02 | Token a punto de expirar (<60 s) | lo renueva |
| A-03 | Login correcto | usa el JWT |
| A-04 | Login falla | **cae a `X-Admin-Key`** — la reserva documentada |
| A-05 | Fallo de red al renovar | no deja el token corrupto para la siguiente llamada |

## Lo que no debe romperse

| # | Verificación |
|---|---|
| N-01 | API 458 · CLIENT 83 · CORE 134 |
| N-02 | Suite de navegador 155/156 |
| N-03 | Cero errores de lint en los cinco proyectos |

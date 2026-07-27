# PT-038 — Cambios de especificación

## Arquitectura / patrón
| Ref | Antes | Después |
|---|---|---|
| **ADR-003 (BFF)** | Correcto en BASE; **roto en CLIENT** para escrituras (AUD-003) | BFF completo también en CLIENT (proxy `/api` inyecta `Bearer`) |
| **RF-UI-06** (docs-v2 2-producto) | Escrituras de CLIENT llaman al API directo (✗) | Escrituras vía proxy BFF same-origin (✓) |
| **RN-54 (CSRF)** | Bearer + sameSite | Sin cambios (misma postura que BASE) |

## Contrato de API
- **Sin cambios en el API.** El cliente pasa a llamar los métodos/rutas que **ya existen** (`PATCH /users/me`, `PATCH /users/me/settings`, `PATCH /auctions/:id`, `POST /users/me/enable-seller`). Se corrigen mismatches del lado cliente.

## Documentación a actualizar (STATE 7)
- `docs-v2/2-producto/Modelo-Funcional-y-Reglas.md` (RF-UI-06 → operable).
- `docs-v2/transversal/Registro-de-Hallazgos.md` (AUD-003 → estado).
- `docs-v2/transversal/Catalogo-de-Casos-de-Uso.md` (UC-08/09/11/12/16 dejan de estar bloqueados por auth UI).
- `docs-v2/transversal/Registro-Maestro-de-ADR.md` (ADR-003 nota de cumplimiento en CLIENT).

## Nota
AUD-002 (UI de puja) sigue pendiente: PT-038 arregla las escrituras **existentes**; la página de puja inexistente es otro PT.

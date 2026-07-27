# PT-038 — Fuera de alcance

Corrige AUD-003 (escrituras de CLIENT sin auth) + los mismatches de ruta asociados. Quedan fuera:

1. **AUD-002 — UI de puja + cliente Socket.io**: la página de puja inexistente es un PT propio (FEATURE). PT-038 solo repara las 8 escrituras **existentes**.
2. **CSRF hardening (AUD-014)**: se mantiene la postura actual de BASE; endurecer CSRF es otro PT.
3. **ADMIN app**: su BFF es distinto (sesión + API-key); no se toca aquí.
4. **Framework de tests del frontend**: solo se añade la config mínima para el unit de `injectAuthHeader`; no se crea una suite completa de CLIENT.
5. **Refactor del JS inline** de las plantillas más allá del `fetch` corregido (la convención `public/js/pages/` inexistente, AUD-030, es otro tema).
6. **Cambios en el API** (rutas/métodos): el API es la fuente de verdad; se corrige el cliente.

Hallazgos tocados tangencialmente se registran, no se corrigen aquí.

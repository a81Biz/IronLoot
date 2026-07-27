# PT-105 — out-of-scope.md

| Fuera de alcance | Por qué |
|---|---|
| **Unificar los tres CSS** | Otro refactor, y mezclarlo haría el diff irrevisable |
| **Adoptar un sistema de utilidades** (Tailwind y similares) | Cambia la arquitectura del frontend, que es CSS plano por decisión |
| **Los estilos que genera el JavaScript** | La CSP no los cubre; no son deuda |
| **Cambiar cualquier apariencia** | Es un refactor: si algo se ve distinto, es un fallo |
| **Otras directivas de la CSP** | `script-src` lo cerró PT-096; el resto no está en deuda |
| **Cerrar el bug** | El agente no cierra |

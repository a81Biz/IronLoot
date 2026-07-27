# PT-110 — test-scenarios.md

| ID | Escenario | Esperado |
|---|---|---|
| VU-01 | `engine.io` instalado no está en `4.1.0 – 6.6.7` | Fuera del rango |
| VU-02 | Control: la comprobación **rechaza** una versión del rango (6.6.5) | Rechazada |
| VU-03 | Control: **acepta** una fuera (6.6.9) | Aceptada |
| VU-04 | Los dos gateways declaran cota de conexión | Ambos |
| RG-01 | **Fase 32**: la puja llega al otro navegador | 8/8 |
| RG-02 | Suite completa | 193/193 |
| RG-03 | `npm test` | 720+ |
| RG-04 | Fases 70 y 71 (pasarelas reales) | 16/16 y 17/17 |

> VU-02 y VU-03 son los que dan valor a VU-01: sin ellos, un verde podría significar que la
> comprobación no sabe leer una versión.

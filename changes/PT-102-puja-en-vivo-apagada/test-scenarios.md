# PT-102 — test-scenarios.md

## Guarda estática — `src/apps/client/test/orden-de-scripts.spec.ts`

| ID | Escenario | Esperado |
|---|---|---|
| OS-01 | `detail.html` usa `io`: ¿aparece socket.io **antes** que el script propio? | El CDN precede al propio |
| OS-02 | Ambos `<script>` de esa plantilla llevan `defer` | Ambos |
| OS-03 | Barrido de **todas** las plantillas de CLIENT: ninguna carga un script propio que use `io` sin socket.io previo | Ninguna infractora |
| OS-04 | El SRI de PT-089 sigue en su sitio | `integrity` y `crossorigin` presentes en el CDN |
| OS-05 | Caso de control: una plantilla ficticia con el orden invertido | **Rechazada** — si no, la guarda no discrimina |

> **OS-05 es el que da valor a los demás.** Una guarda que solo ve verde no prueba que sepa ver
> rojo. El caso de control se construye en memoria, no toca el repositorio.

## Fase de navegador — `tests/qa-browser-suite/32-puja-en-vivo.cjs`

| ID | Escenario | Esperado |
|---|---|---|
| V-LIVE-1 | A abre el detalle de una subasta `ACTIVE` | La página carga: formulario presente, sin rebote a `/login` |
| V-LIVE-2 | ¿Abre el navegador el WebSocket? | Handshake `socket.io` hacia **el propio dominio**, no un `localhost:<puerto>` |
| V-LIVE-3 | **B puja por el formulario; A no recarga** | El precio de A sube al importe de B, en menos de 15 s |
| V-LIVE-4 | La lista de «Pujas recientes» de A | Crece con la puja de B |
| V-LIVE-5 | La cuenta atrás sigue viva tras `defer` | Muestra tiempo restante, no vacío ni `NaN` |
| V-LIVE-6 | Violaciones de CSP durante todo el recorrido | Cero |
| V-LIVE-7 | La puja quedó asentada | `current_price` en la BD ≥ el importe pujado |

**V-LIVE-3 es el criterio del PT.** Los demás existen para que, si falla, se sepa **dónde**.

### Cómo se evita que V-LIVE-3 sea frágil

- Espera **activa** con reintentos (hasta 15 s), nunca `sleep` fijo.
- B puja por el **formulario real**, no por `fetch` directo: se prueba el camino del usuario.
- El pujador es un usuario que **no** va ganando ya — pujar contra uno mismo se rechaza
  legítimamente, y confundir eso con un fallo fue un error real durante la validación de F-34.

## Regresión — lo que debe seguir igual

| ID | Escenario | Esperado |
|---|---|---|
| R-01 | Las 83 pruebas de CLIENT | Verdes, incluida `plantillas-sin-js-inline` de PT-096 |
| R-02 | `E2E-5` / `E2E-6` / `E2E-ledger` | Verdes: bloqueo de fondos, *outbid*, ledger |
| R-03 | Suite completa | 168 previos + los nuevos |
| R-04 | ADMIN (`dashboard.html`, Chart.js) | Su orden ya es correcto; la guarda no debe estorbarlo |
| R-05 | `npm test` en la raíz | 5 proyectos, 691 + nuevos |

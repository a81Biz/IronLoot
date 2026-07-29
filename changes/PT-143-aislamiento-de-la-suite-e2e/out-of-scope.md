# PT-143 — Fuera de alcance

| # | Qué | Por qué | Dónde va |
|---|---|---|---|
| 1 | **`--runInBand`** | Haría verde una suite que sigue sin poder correr en paralelo. Descartado por escrito, no por olvido | — |
| 2 | **Una base por worker** (`JEST_WORKER_ID`) | Aislamiento más fuerte, coste de arranque por worker. Se reserva por si acotar no basta | PT propio si acotar falla |
| 3 | **Rediseñar las 18 suites** | Se acotan las limpiezas y se añaden guardas. Reescribirlas es otro trabajo | — |
| 4 | **El contrato real de las pasarelas** | Ya está cubierto por la suite de navegador, que cobra de verdad en Mercado Pago y PayPal (PT-134) | — |
| 5 | **Que `build` y `docker` pasen** | Este PT los **desbloquea**. Si fallan, se trian con la regla de PT-136 | PT propio si aparece |
| 6 | **Velocidad de la suite** | Se busca aislamiento | — |
| 7 | **`src/`** | Ni una línea | — |

## Lo que sí entra aunque parezca de otro

- **`auth-helper`**, que no es `orders-flow` pero produce el mismo tipo de fallo por el mismo motivo.
- **La decisión sobre `payments.e2e`**: no es aislamiento, pero es el otro fallo que impide ver
  `build` y `docker`, y dejarlo fuera haría que este PT no consiguiera lo que promete.

## Deuda que este PT NO deja

**Cero deuda diferida.** Si al acotar las limpiezas aparece que dos suites dependen de datos
compartidos por diseño, se declara por escrito y se abre PT — no se resuelve volviendo a truncar.

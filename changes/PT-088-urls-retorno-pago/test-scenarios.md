# test-scenarios — PT-088

## Automatizados (15 tests nuevos)

### URLs de retorno — `return-urls.spec.ts`

- **U-01** usa `CLIENT_URL` tal cual se configuró
- **U-02** respeta un origen con puerto no estándar (un CI es un caso legítimo)
- **U-03** descarta la barra final, para no generar rutas con doble barra
- **U-04** sin configurar cae en el subdominio local, **nunca** en un puerto suelto
- **U-05** una sola ruta canónica para todas las pasarelas
- **U-06** el estado viaja como parámetro, no como ruta distinta
- **U-07** la referencia se codifica para la URL
- **U-08** en producción la URL es https y **sin puerto**

### Estado del depósito — `deposit-status.spec.ts`

- **S-01** el dueño ve el estado de su depósito
- **S-02** otro usuario **no** puede consultarlo: se comporta como inexistente
- **S-03** una referencia inexistente da 404
- **S-04** un depósito abierto se informa **pendiente**, no fallido
- **S-05** uno rechazado se informa fallido, no pendiente
- **S-06** uno vencido es fallido: se asumió no resuelto
- **S-07** no expone datos internos del ciclo (`id`, `userId`, `responseSnapshot`)

### Regresión corregida

- **T-17** (reescrito) las URLs de PayPal usan la ruta canónica **sin puertos**. Antes exigía
  `5175`, fijando en piedra el propio defecto y apuntando a una ruta inexistente.

## Verificación en navegador (no automatizada)

| Paso | Resultado observado |
|---|---|
| Login en `base.ironloot.local` | redirige a `client.ironloot.local/dashboard` |
| Cookies | `access_token@.ironloot.local`, `refresh_token@.ironloot.local` |
| Depósito PayPal 275.40 | checkout real, aprobación del comprador, vuelta a `/wallet/deposit/return` |
| Página de retorno, inmediata | «Tu pago está en proceso — 275.4 MXN» |
| Tras el cron | «Depósito acreditado — 275.4 MXN … con PayPal» |
| Depósito MercadoPago 189.90 | «Depósito acreditado — 189.9 MXN … con MercadoPago» |
| Monedero final | **MXN 465.30** |

Ninguna URL del recorrido lleva puerto.

## Lo que no se probó, dicho claro

- **HTTPS**: la configuración lo soporta (`PUBLIC_SCHEME=https`) pero no se ejercitó.
- **El clic del checkout de Mercado Pago**: exige un comprador de prueba que no tenemos.
- **Un `status` manipulado a mano** en la URL: la defensa existe y está cubierta por S-01..S-07,
  pero no se probó desde el navegador editando la barra de direcciones.

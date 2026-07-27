# tasks — PT-096

| id | Objetivo | Validación | Estado |
|---|---|---|---|
| PT-096.1 | Script delegado en ADMIN (`ui-behaviours.js`) | confirmación cancela el envío, en navegador | **DONE** |
| PT-096.2 | 24 manejadores `on*` de ADMIN → `data-*` | `grep on*=` en `src/admin/views` vacío | **DONE** |
| PT-096.3 | Extraer los 8 `<script>` de página de ADMIN | cero `<script>` con cuerpo en ADMIN | PENDING |
| PT-096.4 | Script delegado en BASE + sus manejadores | ordenar el catálogo funciona | PENDING |
| PT-096.5 | Extraer los 5 `<script>` de página de BASE | cero `<script>` con cuerpo en BASE | PENDING |
| PT-096.6 | Script delegado en CLIENT + sus manejadores | depósito y retiro funcionan | PENDING |
| PT-096.7 | Extraer los 9 `<script>` de página de CLIENT | cero `<script>` con cuerpo en CLIENT | PENDING |
| PT-096.8 | Los 3 valores interpolados pasan por `data-*` | guarda de plantillas | PENDING |
| PT-096.9 | Retirar `'unsafe-inline'` de `scriptSrc` en los tres | CSP servida sin él | PENDING |
| PT-096.10 | Guarda: ninguna plantilla con `on*=` ni `<script>` con cuerpo | test que falla si reaparece | PENDING |
| PT-096.11 | Suite 168/168 | corrida completa | PENDING |

## Lo que este PT NO va a hacer

`'unsafe-inline'` en `styleSrc`. Un estilo inline no ejecuta código: es otra directiva, otro
riesgo y otro trabajo.

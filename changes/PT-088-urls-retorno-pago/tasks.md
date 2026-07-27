# tasks — PT-088

> Retroactivo: refleja lo ejecutado, no un plan aprobado de antemano.

| id | Objetivo | Salidas | Validación | Estado |
|---|---|---|---|---|
| PT-088.1 | Fuente única del dominio público | `PUBLIC_SCHEME`/`PUBLIC_DOMAIN` derivando 3 variables en 4 servicios | `docker exec` muestra las URLs coherentes | DONE |
| PT-088.2 | `return-urls.ts` con ruta canónica | `depositReturnUrl()`, `clientOrigin()` | 8 tests U-01..U-08 | DONE |
| PT-088.3 | Los 4 adaptadores usan la fuente única | cero valores por defecto propios | `grep localhost:517` sin resultados | DONE |
| PT-088.4 | `GET /payments/status/:reference` | `statusFor()` con comprobación de propiedad | 7 tests S-01..S-07 | DONE |
| PT-088.5 | Ruta y vista de retorno en CLIENT | `/wallet/deposit/return` + `deposit-return.html` | navegador | DONE |
| PT-088.6 | Refresco automático mientras está pendiente | `deposit-return.js` | navegador: «en proceso» a «acreditado» | DONE |
| PT-088.7 | nginx al puerto 80 | `NGINX_HTTP_PORT=80` | los 4 subdominios responden | DONE |
| PT-088.8 | Dominio de desarrollo `ironloot.local` | cookie en `.ironloot.local` | la sesión cruza BASE a CLIENT | DONE |
| PT-088.9 | Vaciar el override con su explicación | `services: {}` + motivo | `docker-compose config` coherente | DONE |
| PT-088.10 | Reescribir `T-17`, que exigía el defecto | exige ruta canónica sin puerto | suite verde | DONE |
| PT-088.11 | Excepción en `.gitignore` para el JS de navegador | `!src/apps/*/public/js/**/*.js` | el script llega al repositorio | DONE |
| PT-088.12 | Demostración en navegador de ambas pasarelas | capturas + log | PayPal 275.40 + MP 189.90 = 465.30 | DONE |

## Lo que este PT debió tener y no tuvo

| Estado FDGE | Qué pasó |
|---|---|
| STATE 1-B | **Saltado.** La investigación se hizo, pero en el chat y sobre la marcha; el `DISCOVERY.md` es retroactivo |
| STATE 2 | **Saltado.** `PLAN_ACTUAL.md` conservaba el de PT-087 |
| STATE 3 | **Saltado.** Este paquete es retroactivo |
| Proposal Gate | **Saltado.** No hubo ACK antes de escribir código |
| STATE 4 (rama) | **Incumplido.** Se usó la rama de PT-087 |
| STATE 4 (tests RED) | **Cumplido.** Los 15 tests se escribieron y fallaron antes de implementar |
| STATE 5 | Cumplido (evidencia + este self-review) |
| STATE 7 | Cumplido |

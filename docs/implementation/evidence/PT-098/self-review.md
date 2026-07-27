# Self-Review — PT-098

## Protocolo

| Estado | Cumplido |
|---|---|
| STATE 1-B | Sí — los cuatro eslabones leídos y citados |
| STATE 2 | Sí — con la comparación explícita de las dos opciones y por qué se elige la relativa |
| STATE 3 | Sí |
| Proposal Gate | ACK delegado para toda la matriz |
| STATE 4 rama propia | Sí — `fix/PT-098-puja-en-vivo` |
| STATE 4 tests RED | **Sí** — 2 tests en rojo antes de tocar nada |
| STATE 5 | Sí, incluida verificación con dos navegadores reales |
| STATE 6 | `VALIDATION_PENDING` |
| STATE 7 | Al cerrar |

## Una afirmación que corregí a mitad

El DISCOVERY decía primero que CLIENT **no tenía** infraestructura de tests. Lo comprobé antes de
darlo por bueno y era falso: tiene `"test": "jest"` y cuatro specs. La corrección quedó anotada en
el propio DISCOVERY. Si no lo hubiera comprobado, la guarda de regresión habría acabado en la
suite de la API, donde no le corresponde.

## Criterios de éxito

- [x] Un segundo navegador ve la puja del primero sin recargar
- [x] La conexión va contra `client.ironloot.local`, no contra `api:3000`
- [x] La CSP no menciona ninguna dirección interna
- [x] Ninguna plantilla incrusta un origen absoluto — fijado por test
- [x] Suites: API 60/406, CLIENT 5/71, CORE 8/134, BASE compila

## Riesgo que se comprobó en vez de asumirse

El plan anotaba que `connect-src 'self'` **podría** no cubrir el WebSocket del mismo origen y que
había que medirlo. Se midió: lo cubre. El WebSocket se abrió con la CSP restringida a `'self'`.

## Lo que NO se tocó, a propósito

No se revisó si existen otros espacios de nombres de WebSocket con el mismo defecto. Si los hay,
**entran en la matriz como hallazgo propio**; arreglarlos de paso habría dejado un cambio sin su
ciclo. Queda anotado como pendiente de revisión en PT-097 (suites).

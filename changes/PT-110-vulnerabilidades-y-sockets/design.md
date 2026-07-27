# PT-110 — design.md

**BUG · STANDARD · H-008 (PTSA D2, ALTA)**

## D1 — Se arregla lo medible, se declara lo demás

La tentación con 71 avisos es el número: bajarlo a cero. Pero 22 exigen cambio de versión mayor en
un servidor de pagos, y `--force` sobre eso es más peligroso que los avisos — ninguno de los cuales
se ha demostrado explotable.

Así que el PT hace tres cosas distintas y las mantiene separadas:

1. **Lo alcanzable sin credenciales** → se cierra (`engine.io` + cotas en los gateways).
2. **Lo que se arregla sin riesgo** → se aplica (`npm audit fix`, sin `--force`).
3. **Lo que exige cambio mayor** → se lista con nombre y motivo en el registro de deuda.

## D2 — La CVE no es el problema, es el amplificador

El grafo destapó dos namespaces públicos **sin cota de conexiones**, y `@nestjs/throttler` no cubre
sockets. Eso es un vector de agotamiento aunque `engine.io` no tuviera ningún aviso.

Subir la versión sin poner cotas sería arreglar el titular y dejar el fondo. Es el mismo error que
F-36: arreglar donde se observó y no donde vive.

## D3 — El namespace público sigue siendo público

`auctions` no se autentica. Es una decisión de producto de PT-039 y sigue siendo correcta: la puja
en vivo la ve cualquiera desde el catálogo, sin cuenta. Lo que cambia es que deje de ser
**ilimitado**, no que deje de ser público.

## D4 — Las cotas se miden, no se inventan

Un `maxHttpBufferSize` arbitrario puede cortar a un usuario legítimo. Los eventos que viajan por
estos namespaces son pequeños —un id de subasta, un importe, una marca de tiempo— así que el límite
se fija con holgura sobre lo observado, no sobre una cifra bonita.

## Lo que este PT NO hace

- No usa `npm audit fix --force`.
- No autentica el namespace público.
- No afirma que ninguna vulnerabilidad sea explotable: no se ha demostrado.
- No cierra H-008. Lo deja **parcialmente atendido**, con lo pendiente escrito.

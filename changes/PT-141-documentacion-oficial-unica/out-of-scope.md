# PT-141 — Fuera de alcance

## Explícitamente excluido

| # | Qué | Por qué | Dónde va |
|---|---|---|---|
| 1 | **Auditar el contenido de `docs-v2/`** | Este PT decide su **estatus**, no su exactitud. Si sus 31 documentos tienen afirmaciones falsas, es hallazgo de PTSA (D4), no de un refactor documental | PTSA, próxima sesión |
| 2 | **Reescribir o reorganizar `docs-v2/`** | Se le da autoridad, no forma nueva. Cambiar las dos cosas a la vez haría imposible saber qué rompió qué | PT propio si hace falta |
| 3 | **`docs/methodology/`** | Es la autoridad de los cuatro frameworks y `CLAUDE.md` depende de ella. Moverla sería mover el suelo | — |
| 4 | **`PTSA/`, `changes/`, `docs/implementation/`** | Son evidencia e historia, no documentación de producto | — |
| 5 | **Escribir `PTSA/Motor-PTSA.md` y `PTSA/PTSA.md`** | Escribir dos documentos para justificar dos referencias es al revés. La especificación oficial existe y basta. **Si el humano los quiere, se escriben** — es la única de estas exclusiones que su ACK puede revertir | Decisión del humano |
| 6 | **Una guarda sobre la prosa documental** | Obligaría a redactar de cierta forma para pasar. Decidido en PT-140 | — |
| 7 | **Regenerar Foundation ahora** | Documentaría el CI que no corre, el contrato de Redis roto, ocho guardas que no pueden correr y dos pantallas muertas **como si fueran diseño** | **PT-141.B**, después de PT-136…139 |
| 8 | **Unificar `docs/qa/` y `docs/design/`** con `docs-v2/5-qa` y `7-ux` | Podría haber solapamiento. Se mide en PT-141.A.2 y, si lo hay, se registra; consolidarlo es otro trabajo | PT propio |
| 9 | **Borrar `01`…`09`** | Se archivan **con mapa**. Borrar documentación citada por PT anteriores rompería la trazabilidad que este repositorio usa para auditar | — |

## Lo que sí entra aunque parezca de otro

- **Las dos citas rotas de `CLAUDE.md`.** Llevan cuatro sesiones PTSA como pendiente «del humano».
  Son de la misma familia que este PT —una cita que apunta a nada— y arreglarlas cuesta dos líneas.
- **La contradicción de `10-Technical-Debt.md:103-105`.** Es prosa, ninguna guarda la caza, y este es
  el PT que toca ese fichero. Dejarla sería pasar al lado de un documento que se contradice a sí
  mismo mientras se reordena la documentación.
- **`enterprise-documentation/README.md`.** Anunciaría doce documentos de los que nueve están
  archivados.

## Deuda que este PT NO deja

**Cero deuda diferida.** Si el inventario de solapamiento (PT-141.A.2) encuentra que algún documento
de `01`…`09` tiene contenido que `docs-v2/` no cubre, **no se archiva**: se conserva o su contenido se
lleva a `docs-v2/` dentro de este PT. La premisa del README de `docs-v2/` —*«sustituye
funcionalmente»*— se comprueba, no se asume.

## Riesgo aceptado explícitamente

**Los PT anteriores citan documentos que se mueven.** `HISTORY.log`, los 37 paquetes de `changes/` y
las evidencias contienen rutas a `01`…`09`. Esas citas seguirán resolviendo mientras el archivo exista
—por eso no se borran— pero apuntarán a `archive/`. Se acepta: reescribir historia para que las rutas
queden bonitas violaría el carácter append-only de `HISTORY.log`, que PT-140 acaba de reforzar.

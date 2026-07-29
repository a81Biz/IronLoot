# PT-145 — Fuera de alcance

| # | Qué | Por qué | Dónde va |
|---|---|---|---|
| 1 | **Un índice único parcial en crudo** para `AccountVerification` | Divergiría de `schema.prisma` y pondría rojo `audit:schema` — el checkpoint que PT-127 creó para impedir esa divergencia. Si algún día Prisma soporta índices parciales, se revisa | — |
| 2 | **Rediseñar la verificación de cuenta** | Se impide el duplicado. El flujo —envío, token, confirmación, reintegro— no se toca | — |
| 3 | **`WalletService`** | El envío de dinero ya pasa por los caminos que PT-146 bloqueó | — |
| 4 | **Reconciliar duplicados históricos** | Medido: **cero** en las dos tablas, que además están vacías | — |
| 5 | **Barrer otras invariantes parciales** sin restricción | Si las hay, es un barrido propio | PT propio |
| 6 | **El job `docker`** | PT-147 | — |

## Lo que sí entra aunque parezca de otro

- **Retirar las dos excepciones de RULE-22.** Son de PT-142, y su prueba de caducidad va a fallar en
  cuanto estos dos sitios se corrijan. Dejarlas sería que la guarda mintiera.
- **La medición previa de duplicados.** No arregla nada, y sin ella la migración podría fallar a
  mitad y dejar el esquema a medias.

## Deuda que este PT NO deja

**Cero deuda diferida.** Si al bloquear el método de pago aparece que la verificación depende de algo
más ancho, se declara por escrito — no se resuelve ensanchando la restricción «para que al menos
evite el caso feo», que es la salida que este diseño rechaza explícitamente.

## Riesgo aceptado explícitamente

**Las dos correcciones son distintas**, y eso puede leerse como inconsistencia. No lo es: la
restricción única es la herramienta cuando la invariante cabe en un índice, y el bloqueo cuando no.
Queda escrito en **RULE-25** para que el siguiente no lo interprete como un descuido.

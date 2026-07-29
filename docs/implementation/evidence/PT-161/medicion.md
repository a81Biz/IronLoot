# PT-161 — La imagen de producción: medido, y revertido

**Resultado: el cambio no se adopta.** La causa era correcta y la magnitud no.

## La tarea decía: confirmar la causa antes de tocar nada

Confirmada. `src/api/Dockerfile:150` copia `node_modules` **desde el builder**, que instala con
dependencias de desarrollo porque las necesita para compilar. La imagen se las lleva.

Y estaba **declarado**, no olvidado. El Dockerfile ya explica las dos salidas probadas en PT-129 y por
qué fallan:

```
npm prune --production                   → se lleva los binarios opcionales por plataforma
                                           (@css-inline/css-inline-linux-x64-musl)
npm install --omit=dev                   → dispara el `prepare` (husky), exit 127
npm install --omit=dev --ignore-scripts  → se salta el `postinstall` de Prisma, cliente a medias
```

## La tercera vía, que ninguna contemplaba

Saltarse los scripts **y generar el cliente de Prisma a mano**, en una etapa aparte (`deps-prod`).
Resuelve las dos objeciones: husky no corre, y `prisma generate` no depende de un `postinstall`.

**Funciona.** La imagen construye.

## Y aquí es donde se cae

```
ironloot-api:pt129   548 MB     ← actual
ironloot-api:pt161   531 MB     ← con la tercera vía
                     ──────
                      17 MB     3.1 %
```

Las capas dicen por qué:

```
304 MB   COPY node_modules        ← node_modules de PRODUCCIÓN, ya sin dev deps
574 kB   COPY dist
 76 kB   COPY prisma
```

**Las dependencias de desarrollo eran 17 MB de 548.** Lo que pesa son los `node_modules` de
producción —dominados por los motores de Prisma— y la propia imagen base.

> La premisa de R-015 era **correcta en la causa y equivocada en la magnitud**. Y eso sólo se sabe
> midiendo: el ítem se priorizó sobre «la imagen se lleva dependencias de desarrollo», que es cierto
> y no es el problema.

## Por qué se revierte

1. **3.1 % no justifica el riesgo.** Esta zona ha tirado cinco contenedores en tres PT distintos
   (PT-129, PT-135, y el episodio de los locks). El modo de fallo es el peor que hay: **construye y
   no arranca**, días después y en otra máquina.
2. **La decisión de PT-129 sigue siendo correcta**: *«una imagen grande que arranca vale más que una
   pequeña que no»*.
3. **La palanca real está en otro sitio.** 304 MB de `node_modules` de producción es la pregunta
   interesante, y es otra investigación — más grande, con su propia evidencia.

## Nota sobre la verificación, porque casi me equivoco

La imagen recortada no completó el arranque en mi prueba: `MERCADO_PAGO_ACCESS_TOKEN not configured`.
Antes de concluir nada, arranqué **la imagen actual con el mismo comando**: falla **idéntico**. Era mi
entorno de prueba, no una regresión.

Sin ese control habría reportado una regresión falsa — que es lo mismo que casi me pasa en PT-148 al
revés, creyéndole a una guarda recién ampliada.

## Estado

`CLOSED` — medido, premisa refutada en magnitud, cambio revertido. **Hallazgo nuevo registrado**: los
304 MB de `node_modules` de producción, que es donde está el peso de verdad.

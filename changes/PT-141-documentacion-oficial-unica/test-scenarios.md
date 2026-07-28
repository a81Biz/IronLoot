# PT-141 — Escenarios de prueba

> Este PT no toca `src/`. Sus «pruebas» son las tres guardas documentales, un barrido de rutas y la
> lectura de un tercero. Se listan igual: **un cambio sin forma de comprobarse es un cambio sin
> evidencia.**

## Las citas de `CLAUDE.md` — el barrido que hoy falla

| # | Escenario | Hoy | Esperado |
|---|---|---|---|
| CIT-01 | Toda ruta con `/` citada en `CLAUDE.md` existe | **Fallan dos**: `PTSA/Motor-PTSA.md`, `PTSA/PTSA.md` | Cero fallos |
| CIT-02 | Tras reapuntar las 10 citas del árbol documental | — | Cero fallos |
| CIT-03 | Tras archivar `01`…`09` | — | Cero fallos. Ninguna referencia colgando |

## Las guardas documentales — antes y después de cada movimiento

| # | Prueba | Antes | Después |
|---|---|:--:|:--:|
| G-01 | `coherencia-documentacion-codigo.spec.ts` | Verde | **Verde** |
| G-02 | `coherencia-deuda-tecnica.spec.ts` | Verde | **Verde** |
| G-03 | `contexto-de-construccion.spec.ts` | Verde | **Verde** |
| G-04 | Citas vigiladas por G-01 | *N* | **≥ *N***. Ninguna perdida; si se mudaron, la guarda se amplía |

> G-04 es el criterio que impide reintroducir H-016. Mover documentos desplaza líneas, y **un documento
> con citas rotas se lee con confianza y es falso**.

## La contradicción de TD-005

| # | Escenario | Esperado |
|---|---|---|
| TD-01 | `10-Technical-Debt.md:103-105` | Ya no dice «Queda `styleSrc`, que sigue llevándolo» |
| TD-02 | Coherencia con `:289-292` (TD-014 CERRADA) | Sin contradicción |
| TD-03 | Coherencia con el código | Ningún `main.ts` de los tres lleva `'unsafe-inline'`. Verificable hoy |
| TD-04 | ¿Alguna guarda lo cazaba? | **No.** Es prosa, y PT-140 decidió a conciencia no escribir una que lo hiciera |

## Que las reglas no se desactiven al reapuntarlas

**El riesgo real de PT-141.A.4.** Una redacción que apunte bien pero obligue menos es peor que no
tocar nada.

| # | Regla | Esperado |
|---|---|---|
| REG-01 | «No Foundation Skip» | Sigue **impidiendo** trabajar sin documentación verificada |
| REG-02 | «No Architecture Blindness» | Sigue **obligando** a consultar arquitectura antes de tocar código |
| REG-03 | Fuentes obligatorias de STATE 1-B / 1-E / 1-R | Siguen siendo obligatorias; cambia dónde están |
| REG-04 | Lectura por un tercero | Alguien que no participó responde: **¿qué consulto antes de tocar código?** |

## La regeneración (141.B)

| # | Escenario | Esperado |
|---|---|---|
| FND-01 | PT-136…139 cerrados con entrada en `HISTORY.log` | **Si alguno sigue abierto, 141.B no empieza** |
| FND-02 | `11-Conventions.md` regenerado | **Veinte** RULE, cada una con ejemplo real |
| FND-03 | Cada afirmación | Con cita `fichero:línea` **verificable** |
| FND-04 | Lo no citable | En `10-Technical-Debt.md` como «no determinado». **Nunca inventado** |
| FND-05 | Las tres guardas contra lo regenerado | Verdes. Es la prueba de que no se reintrodujo H-016 |
| FND-06 | `[FOUNDATION VALIDATED]` | **Lo emite el humano.** El agente no lo cierra |

## El inventario de solapamiento (141.A.2)

| # | Escenario | Esperado |
|---|---|---|
| INV-01 | Cada uno de `01`…`09` | Tiene equivalente identificado en `docs-v2/`, **o** se conserva |
| INV-02 | Documento sin equivalente | **No se archiva.** No se asume la premisa del README de `docs-v2/`: se comprueba |
| INV-03 | `archive/README.md` | Mapa documento a documento. Archivar sin mapa es un cementerio |

## Regresión

| # | Suite | Línea base |
|---|---|---|
| REG-05 | Unitarias | **944** |
| REG-06 | e2e | **77** |
| REG-07 | Navegador | **176** |

> Este PT no toca `src/`. Se corre igual: es la única forma de demostrar que no se tocó.

## Lo que NO se prueba aquí

- **La exactitud del contenido de `docs-v2/`.** Este PT decide su estatus, no lo audita. Si está mal,
  es hallazgo de PTSA (D4).
- Que la documentación sea buena. Que sea **una**, y que sus citas apunten a donde dicen.

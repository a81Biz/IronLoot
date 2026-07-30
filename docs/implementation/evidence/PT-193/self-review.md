# PT-193 — Self-Review (FDGE STATE 5)

**Objetivo:** decidir y ejecutar `TD-024` — los símbolos que `@ironloot/core` exportaba sin un solo
consumidor fuera del paquete. Decisión del humano sobre dos preguntas medidas.

## Lo primero que hay que decir: ocho de los veinticuatro ya estaban decididos

PT-191 abrió `TD-024` sobre los 24 **como si estuvieran sin decidir**. Al medir para plantear la
decisión apareció que **ADR-033 ya conserva 8 de ellos** —los cuatro `I*Repository` y sus `*Summary`—
«marcados como previstos-no-adoptados», con criterio de revisión escrito: *cuando exista más de una
implementación de persistencia, o cuando el dominio deba probarse sin base de datos*.

Y otros 2 eran **falsos positivos de mi propia medición**: `BidValidationContext` y
`BidValidationResult` son los tipos de `validateBid()`, que sí se usa — no se nombran en la llamada
porque TypeScript resuelve estructuralmente.

**La decisión real era sobre 15, no sobre 24.** Abrir una deuda sin comprobar si ya había una decisión
produce trabajo duplicado y una lista que exagera lo pendiente: el número «24» circuló como si fuera
todo trabajo por hacer.

## El caso que decidió la retirada

`IPaymentProvider`. Declaraba qué debe cumplir una pasarela… y **ningún adaptador lo implementaba**:
los cuatro implementan el `PaymentProvider` que declara el API. Quien leyera `core` para aprender el
sistema obtenía **una respuesta que no se aplica en ninguna parte** y que puede divergir sin que nada
proteste.

Eso no es código muerto —el código muerto se ignora—: es **documentación falsa ejecutable**, que se lee
y se cree. Familia de H-016.

Y la distinción que sostiene la decisión: **un puerto sin adaptador se conserva** (es una intención de
diseño, y ADR-033 la registró con su criterio); **un contrato duplicado no** (es una segunda respuesta
a una pregunta que ya tiene una).

## Y ADR-033 se apoyaba en un hecho que no ocurrió

Decía: *«Contraste con PT-080, que sí revivió `IPaymentProvider` porque había una necesidad real»*.
Medido: **cero implementadores**. PT-080 escribió un contrato **nuevo** en el API; no revivió éste.

La decisión de ADR-033 **no cambia** —su criterio de revisión sigue siendo válido—, pero dejaba de
apoyarse en algo real. Lleva su nota de enmienda fechada, como se hizo con `RN-64` y `CR-002`.

## Checklist

- [x] **Tests-first**: la lista declarada se bajó de 24 a 10 **antes** de tocar código → `C1` y `C3` en
      RED.
- [x] **Guarda vista fallar por su propio motivo**: añadido un símbolo huérfano nuevo a `domain/`, la
      guarda lo acusa **con su nombre y su fichero** (`SimboloQueNadieUsa (core/domain/sabotaje.ts)`).
- [x] `core` compila y sus **93 pruebas** pasan; API **1076** en 133 suites.
- [x] Decisión registrada como **ADR-058**, con la alternativa descartada y su criterio de revisión.
- [x] `TD-024` cerrada conservando su enunciado original en un `<details>` — no se reescribe la
      historia, se anota qué se decidió.
- [x] Sin artefactos de depuración: el fichero de sabotaje se borró y el `index.ts` se restauró.

## Detalle de ejecución que conviene saber

Retirar `pagination.dto.ts` dejó `shared/index.ts` **sin exportaciones**, y TypeScript dejó de
considerarlo un módulo (`TS2306`). No se parcheó con un `export {}`: se retiró el directorio, porque un
directorio que sólo contiene reexportaciones vacías no es un punto de extensión — es un sitio donde
alguien volverá a poner algo sin consumidores.

## Estado

Es **REFACTOR** con comportamiento preservado (nada importaba lo retirado) y evidencia: `DONE`.

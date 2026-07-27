# Evidencia — PT-084

> ⚠️ **Evidencia RECONSTRUIDA el 2026-07-27 por PT-090.** No se capturó cuando el trabajo se
> hizo: FDGE lo exige y no se cumplió. Lo que sigue es **solo lo que sigue siendo verificable
> hoy**, ejecutado y medido en el momento de escribirlo. No se reconstruye lo que se observó
> entonces y ya no puede comprobarse: eso sería falsificarla.

## Qué se comprobó

**PT-084 no implementó nada: decidió no adoptar la capa de use-cases de CORE.** Su evidencia es la
decisión y su fundamento, no un resultado de ejecución.

Verificable hoy:

- Los cuatro use-cases documentados **no tienen fuente** en el repositorio. Solo quedaba un
  `dist/` ignorado por git, residuo de un checkout anterior.
- Los contratos de repositorio de CORE **no los referencia nadie**.
- El flujo que gobernarían —orden a `PAID` y crédito `CREDIT_SALE` al vendedor— **funciona** en
  `wallet.service.ts` y `auction-scheduler.service.ts`.

```
cd src/packages/core && npm test
Tests:       134 passed, 134 total   (8 suites)
```

**Lo que sostiene la decisión**: adoptarlos habría reescrito una ruta de dinero que funciona,
exigido cuatro adaptadores que nadie pidió y añadido riesgo de regresión en la liquidación de
subastas. Registrado como **ADR-033**.

## Lo que NO puede reconstruirse

Nada relevante: una decisión de no hacer se sostiene con su razonamiento, y está en el ADR.

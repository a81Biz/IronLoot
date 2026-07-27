# Evidencia — PT-085

> ⚠️ **Evidencia RECONSTRUIDA el 2026-07-27 por PT-090.** No se capturó cuando el trabajo se
> hizo: FDGE lo exige y no se cumplió. Lo que sigue es **solo lo que sigue siendo verificable
> hoy**, ejecutado y medido en el momento de escribirlo. No se reconstruye lo que se observó
> entonces y ya no puede comprobarse: eso sería falsificarla.

## Qué se comprobó

**El panel financiero dejó de mostrar ceros.** `Payment.orderId` pasó a opcional y el ciclo
escribe su fila al liquidar, de modo que `payments` —que seis consultas del admin leen— refleja lo
que ocurre.

```
npx jest --testPathPattern="payment-record"
Tests:       8 passed, 8 total
```

**Verificable hoy contra la base de datos**: la tabla `payments` contiene filas reales de ambas
pasarelas, escritas por este mecanismo durante la verificación de PT-087 y PT-088.

**Nota posterior**: PT-087 encontró que este mismo camino duplicaba el asiento al reabrir un ciclo
(F-12) y lo hizo idempotente por referencia. La evidencia de aquello está en `PT-087/`.

## Lo que NO puede reconstruirse

La captura del panel antes y después, que es lo que mejor lo habría demostrado.

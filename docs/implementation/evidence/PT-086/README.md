# Evidencia — PT-086

> ⚠️ **Evidencia RECONSTRUIDA el 2026-07-27 por PT-090.** No se capturó cuando el trabajo se
> hizo: FDGE lo exige y no se cumplió. Lo que sigue es **solo lo que sigue siendo verificable
> hoy**, ejecutado y medido en el momento de escribirlo. No se reconstruye lo que se observó
> entonces y ya no puede comprobarse: eso sería falsificarla.

## Qué se comprobó

**Traza completa de cada transacción de pago.** `PaymentTraceService` es el punto único de
escritura y la redacción de credenciales vive dentro.

```
npx jest --testPathPattern="payment-trace"
Tests:       18 passed, 18 total
```

Los 18 cubren la estructura de la traza, la redacción a cualquier profundidad y dentro de arrays,
que lo redactado se **marca** en vez de borrarse en silencio, que un fallo al escribirla **no**
tumba el pago, y la serialización de los `Decimal` de Prisma —que llegó a perder entradas enteras
sin que nadie lo notara—.

**Verificable hoy contra la base de datos**: `payment_cycle_events` contiene trazas reales de
siete pasos de pagos de Mercado Pago y de PayPal, con endpoint, estado HTTP y duración.

La fase QA 70 comprueba esto contra la pasarela real y su resultado consta en
`qa-out/20260726-030746/payment-trace.json`: **16 casos, 16 PASS**.

## Lo que NO puede reconstruirse

Nada esencial: la traza es su propia evidencia y sigue en la base de datos.

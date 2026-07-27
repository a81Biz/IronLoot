# Evidencia — PT-082

> ⚠️ **Evidencia RECONSTRUIDA el 2026-07-27 por PT-090.** No se capturó cuando el trabajo se
> hizo: FDGE lo exige y no se cumplió. Lo que sigue es **solo lo que sigue siendo verificable
> hoy**, ejecutado y medido en el momento de escribirlo. No se reconstruye lo que se observó
> entonces y ya no puede comprobarse: eso sería falsificarla.

## Qué se comprobó

**Retención de las tablas de webhooks.** `system-cleanup.service.ts` declara
`WEBHOOK_MIN_RETENTION_DAYS` como suelo por debajo del cual la purga no baja, para no borrar
registros que una pasarela aún podría reintentar.

```
npx jest --testPathPattern="webhook-retention"
Tests:       6 passed, 6 total
```

**Lo que sostiene la decisión**: el suelo de 30 días está por encima de la ventana de reintento de
cualquiera de las pasarelas integradas. `payment_cycles` no se purga nunca — es el registro de qué
pasó con cada solicitud de dinero.

## Lo que NO puede reconstruirse

Los logs de la purga ejecutándose sobre datos reales en su momento. Hoy solo consta que la regla
existe y está probada.

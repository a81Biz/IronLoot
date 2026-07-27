# Evidencia — PT-089

> ⚠️ **Evidencia RECONSTRUIDA el 2026-07-27 por PT-090.** No se capturó cuando el trabajo se
> hizo: FDGE lo exige y no se cumplió. Lo que sigue es **solo lo que sigue siendo verificable
> hoy**, ejecutado y medido en el momento de escribirlo. No se reconstruye lo que se observó
> entonces y ya no puede comprobarse: eso sería falsificarla.

## Qué se comprobó

**Los hallazgos de PT-087/088 que quedaron sin aplicar.**

```
npx jest --testPathPattern="public-origins"
Tests:       14 passed, 14 total
```

| Hallazgo | Comprobación |
|---|---|
| **F-19** SRI | Verificado en navegador **con contraprueba**: hash correcto → carga; hash alterado → bloqueado. Ambos hashes contrastados contra lo que el CDN servía en ese momento |
| **F-21** orígenes públicos | 14 tests. Ninguno de los tres orígenes cae en un `localhost` con puerto |
| **F-22** `NOTIFICATION_RECEIVED` en PayPal | Test P-14, que comprueba además que va **antes** de validar la firma |
| **F-23** runner de QA | `processed_webhook_events` en la lista de truncado; la fase 71 en el resumen final |

**Verificado tras el cambio**: ambas pasarelas siguen creando cobros, y la URL de retorno que se
envió realmente a PayPal fue `http://client.ironloot.local/wallet/deposit/return?...`, sin puerto
—leída de la traza persistida, no del código—.

## Lo que NO puede reconstruirse

Las capturas del navegador durante la contraprueba de SRI.

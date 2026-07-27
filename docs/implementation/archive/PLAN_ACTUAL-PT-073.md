# PLAN_ACTUAL — PT-073 / PT-074 (correcciones de fiabilidad del harness QA)

**Clasificación**: 2 BUGS TRIVIAL (sólo `tests/qa-browser-suite/`, ningún código de producto).
**Objetivo**: eliminar los 2 falsos-negativos del run QA sin tocar producto (verificado: producto correcto).

## PT-073 — Contrato de depósito determinista
- **Solución**: reemplazar el chequeo por evento de respuesta + submit del form (que compite con la navegación
  abortada) por una verificación **determinista** con `page.evaluate(fetch('/api/v1/payments/initiate', {POST, provider:MERCADO_PAGO}))`
  que inspecciona el JSON (`res.ok && data.redirectUrl`). Mantener captura de pantalla del form como evidencia.
- **Alternativa rechazada**: leer el body en el evento antes de navegar (frágil, sigue habiendo carrera).
- **Regresión**: nula fuera del harness. QA-BOOT-10c (fondeo) intacto.
- **Éxito**: QA-BOOT-10b PASS de forma estable.

## PT-074 — Quitar 31-outbid de la secuencia
- **Solución**: eliminar la línea `run_phase ... 31-outbid.cjs` de `run-all.sh`. Se conserva el archivo como
  herramienta standalone. El outbid queda cubierto por E2E-6 de `30-e2e.cjs`.
- **Alternativa rechazada**: hacer que 31-outbid puje 800 con un 3er comprador andamiaje (añade complejidad
  para re-probar algo ya cubierto).
- **Regresión**: nula. Cobertura de outbid preservada por 30-e2e.
- **Éxito**: `run-all.sh` no reporta el FAIL de E2E-6 re-run.

## Verificación (evidencia)
Re-ejecutar QA-BOOT-10b (bootstrap, tras reset) y confirmar PASS; confirmar que `run-all.sh` ya no invoca 31-outbid.

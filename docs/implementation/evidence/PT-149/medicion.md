# PT-149 / PT-153 — Evidencia

Los dos PT comparten evidencia porque comparten los dos ficheros y **el segundo es lo que permite
comprobar el primero**: con `docker exec` roto no había forma de ver `cross_coherence_verified`
calculado sobre datos de verdad.

## Antes (S-003, E-026)

```
$ docker compose exec api npm run audit:domain     ; EXIT=0
/bin/sh: 1: docker: not found
  [n/d ] P-002 → P-003  …  (ERR)      ← las CINCO en error
  …
  cross_coherence_verified = true     ← y aun así, true
```

La causa cabía en una línea: `if (!ok && n !== 'ERR') incoherentes++`. **Un error no contaba**, y el
veredicto era `incoherentes === 0`. Cuantos menos datos, más verde.

## Después

```
$ docker compose exec api npm run audit:domain     ; EXIT=0
  [OK  ] CR-001 · CR-002 · CR-003 · CR-010 · CR-015 · R-5.1c · R-5.2b
  [n/d ] CR-004 · CR-005 · CR-006 · R-5.1a · R-5.1b · R-5.1d · R-5.3b
  rubric_compliance_score = 100
  [OK  ] las cinco comprobaciones de coherencia, con datos reales
  cross_coherence_verified = verificado
  5 de 5 medidas · 0 incoherente(s) · 0 sin poder mirar

$ docker compose exec api npm run audit:reliability ; EXIT=0
  Success / Retry / Failure = SIN_DATOS — no hay ciclos de pago que evaluar
  health_unstable = false
```

**Los dos corren dentro del contenedor**, que es donde vive npm (RULE-15) y donde fallaban.

## Contraprueba — que sepan fallar

Es la comprobación que importa: un arreglo indistinguible del defecto no es un arreglo.

```
$ docker compose exec -e DATABASE_URL="postgresql://x:x@nohost:5432/x" api npm run audit:domain
  EXIT=1
  cross_coherence_verified = sin_datos
  Esto NO es un aprobado: es una comprobacion que no ha podido mirar.
  No se pudo medir. Revisa la conexion a la base antes de leer nada de arriba.

$ … npm run audit:reliability
  EXIT=1
  NO MEDIBLE — no se pudo consultar la base
  Esto NO es «sin datos»: es una medicion que no ha podido hacerse.
```

**Con datos: `verificado`, exit 0. Sin poder mirar: `sin_datos`, exit 1.** Las dos direcciones.

## Un segundo defecto de la misma familia, encontrado al mirar

`reliability-check.ts` capturaba el error de consulta y hacía `return` desde `main()`. **Un `return`
desde `main` sale con código 0**: no poder consultar la base se reportaba como corrida correcta.
Corregido en el mismo PT — es literalmente H-021 en el fichero de al lado, y por eso los dos PT
fueron juntos.

Y queda separado lo que antes se confundía: *«no hay ciclos que evaluar»* (SIN_DATOS legítimo, sale
por `medir()`) y *«no pude mirar»* (sale por el `catch` y **falla**).

## Suite

```
Test Suites: 103 passed, 103 total
Tests:       792 passed, 792 total
```

786 → 792: **6 nuevas** en `veredicto-de-coherencia.spec.ts`, con los cinco casos del veredicto y el
de la salida del proceso.

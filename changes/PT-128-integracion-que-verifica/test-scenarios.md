# PT-128 — Escenarios de prueba

---

## Happy path

### E1 — El job termina, y en verde

```
CREATE DATABASE ci_verify;                      # vacia, como en CI
prisma generate
DATABASE_URL=…/ci_verify prisma migrate deploy
DATABASE_URL=…/ci_verify NODE_ENV=test npm run test:e2e
```

**Aceptación**: el proceso **termina** con exit 0, ejecutando los 17 ficheros.
**Hoy**: no termina; la corrida completa acaba matada por memoria (exit 137).

### E2 — Termina sin `--forceExit`

Misma ejecución, sin la bandera.

**Aceptación**: termina sola.
**Si no se consigue**: la excepción está escrita en `package.json` con el manejador nombrado. Un
`--forceExit` sin explicación **no cumple este escenario**.

### E3 — `build` y `docker` se ejecutan

**Aceptación**: `build` corre y sube el artefacto `dist`. `docker` corre en `prod`/`prep`.
**Hoy**: ninguno de los dos se ejecuta jamás.
**Nota**: `docker` puede fallar por la ruta `./Dockerfile` inexistente — **es PT-129** y se anota
como tal, no se arregla aquí.

### E4 — El job verifica las migraciones sin proponérselo

Introducir un cambio en `schema.prisma` sin migración y lanzar el job.

**Aceptación**: `migrate deploy` produce un esquema incompleto y **los tests fallan**.
Es el efecto lateral buscado de D1: el job de integración es también la red de PT-127.

---

## Casos de control — **obligatorios**

### C1 — El job se pone rojo cuando algo se rompe

Romper a propósito una aserción de un e2e.

**Aceptación**: `test-integration` **falla**, y `build` y `docker` no se ejecutan.
**Si pasa en verde, el job no verifica nada y el PT no está terminado.** Es el criterio de PT-118.

### C2 — El job detecta la ausencia del paso de esquema

Quitar el `migrate deploy` del job.

**Aceptación**: la prueba `job-de-integracion.spec.ts` **falla**.

### C3 — La prueba rechaza `db push` como paso de esquema

Sustituir `migrate deploy` por `db push` en el job.

**Aceptación**: la prueba **falla**. Es la trampa que causó H-014 y hay que cerrarla explícitamente,
no confiar en que nadie la tome.

---

## Casos borde

### B1 — Base vacía sin `prisma generate`

**Esperado**: error claro de cliente no generado, no un cuelgue silencioso.

### B2 — `migrate deploy` sobre base ya poblada

**Esperado**: `P3005`. En CI la base nace siempre vacía, así que no debería darse; si se da, es
señal de que el servicio de Postgres persiste entre corridas y hay que mirarlo.

### B3 — 17 ficheros e2e con datos compartidos

**Riesgo real y no medido.** Sólo se ha ejecutado `auth`. Si los ficheros se pisan entre sí,
aparecerá aquí.
**Aceptación**: si aparece, se registra. Ver `out-of-scope.md` § criterio de crecimiento.

### B4 — Duración del job

Medido: `auth` = 22.5 s con `--runInBand`.
**Aceptación**: el job completo por debajo de 10 minutos. Si se pasa, se paraleliza; no se recorta
cobertura.

---

## Casos de error

### F1 — Postgres del servicio no levanta

**Aceptación**: el job falla con el error de conexión. **Nunca** un verde por `--passWithNoTests`.

### F2 — Una migración inválida

**Aceptación**: `migrate deploy` falla y el job se detiene ahí, antes de los tests. El mensaje debe
señalar la migración.

---

## Regresión

| Comprobación | Estado esperado |
|---|---|
| `security-audit` | **intacto**, 0 avisos. No se toca (PT-118) |
| `lint` · `test-unit` | sin cambios, verdes |
| `npx jest` (API) | 83 suites / 603 tests |
| `npx jest` (CORE) | 8 suites / 134 tests |
| `npm run audit:schema` (PT-127) | 0 diferencias |
| `npm run audit:observability` | `silent_failure_count = 25` |
| Entorno de desarrollo | los cuatro contenedores `healthy` |

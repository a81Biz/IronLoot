# PT-127 — Escenarios de prueba

Criterio del repositorio: **toda prueba de este tipo lleva caso de control.** Una prueba que nunca
se ha visto fallar no demuestra nada — es la lección de PT-118 (el checkpoint declarado que no
existía) y de H-017 (el healthcheck que nadie vio pasar).

---

## Happy path

### E1 — Las migraciones reproducen el esquema

```
CREATE DATABASE ptsa_verify;
DATABASE_URL=…/ptsa_verify prisma migrate deploy
DATABASE_URL=…/ptsa_verify prisma migrate diff \
    --from-schema-datamodel prisma/schema.prisma \
    --to-schema-datasource  prisma/schema.prisma --exit-code
```

**Aceptación**: exit **0**, salida `No difference detected`.
**Hoy**: falla — faltan una tabla, 2 enums, 4 columnas, 1 valor de enum, y sobra un índice no único.

### E2 — La aplicación funciona contra ese esquema

Cliente Prisma real contra la base de E1, cuatro sondas:

```
userPaymentMethod.findMany · paymentCycle.findMany · accountVerification.findMany · payment.findMany
```

**Aceptación**: **4 de 4 OK**.
**Hoy**: 1 de 4 (fallan `user_payment_methods.type`, `payment_cycles.provider_ref`,
`account_verifications`).

### E3 — La restricción de idempotencia existe en el artefacto

```sql
SELECT indexdef FROM pg_indexes WHERE tablename='payments' AND indexdef LIKE '%UNIQUE%';
```

**Aceptación**: aparece `payments_reference_key ... UNIQUE (reference)`.
**Hoy**: sólo `payments_pkey`; `reference` tiene índice corriente.

### E4 — La base de desarrollo queda con historial

```
prisma migrate status        # contra ironloot_db
```

**Aceptación**: sin migraciones pendientes.
**Hoy**: las 23 aparecen como no aplicadas, y `_prisma_migrations` ni siquiera existe.

### E5 — El contenedor arranca aplicando migraciones

```
docker-compose restart api && docker logs ironloot-api --tail 40
curl -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health
```

**Aceptación**: el log muestra aplicación por migración; health **200**; contenedor `healthy`.

---

## Casos de control — **obligatorios**

### C1 — El control detecta un cambio de esquema sin migración

1. Añadir un campo cualquiera a un modelo de `schema.prisma`.
2. `npm run audit:schema`.

**Aceptación**: **falla**, con exit distinto de 0 y mensaje que nombra la divergencia.
**Si pasa, el control no sirve y el PT no está terminado.**

### C2 — El control acepta el cambio una vez generada la migración

1. Con el campo de C1 puesto, `npx prisma migrate dev --name control_ptsa`.
2. `npm run audit:schema`.

**Aceptación**: **pasa**, exit 0.
3. Revertir campo y migración; `audit:schema` vuelve a pasar.

### C3 — Un fallo de migración detiene el arranque

Introducir a propósito un SQL inválido en la última migración y reiniciar el contenedor.

**Aceptación**: el contenedor **no arranca** y el log dice por qué.
**Hoy**: `db push` sigue adelante y el segundo `||` se traga el error con un `echo` — el arranque
parece exitoso pase lo que pase. Revertir tras comprobarlo.

---

## Casos borde

### B1 — `migrate deploy` sobre base ya poblada por `db push`

**Esperado**: `P3005 — The database schema is not empty`. Es el motivo por el que la base existente
se trata con `migrate resolve --applied` (baseline) y no con `deploy`.
**Ya observado en S-002** y es la razón de la tarea PT-127.5.

### B2 — Baseline sobre base con datos

`migrate resolve --applied` ×N sobre `ironloot_db`.

**Aceptación**: recuento **idéntico** antes y después:
`wallets 4 · ledger 15 · payments 1 · bids 3 · payment_cycle_events 49`.
**Cero filas modificadas**: `resolve` no ejecuta DDL ni DML.

### B3 — Segunda ejecución de `migrate deploy` sobre la misma base

**Aceptación**: no-op, sin error. Idempotencia del despliegue.

### B4 [vía B] — Base que ya tenía las 23 aplicadas

**Aceptación**: se rompe, y **es esperado**. Es el riesgo R5 y la razón exacta de la pregunta del
Proposal Gate. Si tal entorno existe, la vía B queda descartada.

---

## Casos de error

### F1 — Base sombra no disponible

`migrate diff --from-migrations` exige una. **Aceptación**: el control falla con un mensaje que
dice que falta la base sombra, **no** un verde silencioso. Un control que no puede comprobar no debe
decir «bien».

### F2 — `schema.prisma` con sintaxis inválida

**Aceptación**: `audit:schema` falla con el error del parser.

---

## Regresión (no negociable)

| Comprobación | Estado esperado |
|---|---|
| `npm run typecheck` (API) | limpio, exit 0 |
| `npx jest` (API) | **83 suites / 603 tests** verdes |
| `npx jest` (CORE) | **8 suites / 134 tests** verdes |
| `npm run audit:check` | 0 avisos, línea base vacía |
| `npm run audit:domain` | `rubric_compliance_score = 100`, 14/14 |
| `npm run audit:observability` | `trace_completeness 100 %`, `silent_failure_count = 25` |
| `npm run audit:reliability` | Success 100 % · Retry 0 % · Failure 0 % |
| Datos de auditoría | wallets 4 · ledger 15 · payments 1 · bids 3 |
| Los cuatro contenedores | `healthy` |

Cualquiera de estas en rojo **detiene el PT**. No se avanza a STATE 6 con una regresión abierta.

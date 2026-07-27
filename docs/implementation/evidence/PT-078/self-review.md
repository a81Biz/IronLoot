# PT-078 — Evidencia y Self-Review

**PT-078** | 2026-07-25 | **BUG** | **STANDARD** | Rama: `fix/PT-078-webhook-dedup-payment-id`
**Ramifica desde**: `feature/PT-076-paypal-orders-v2` | **Commit**: `a49ad94`

---

## Problema

`creditOnce()` (PT-076) solo deduplicaba proveedores que informaban `eventId`, y solo PayPal lo
hacía. **Mercado Pago, Stripe y Hey Banco acreditaban de nuevo en cada reentrega** (TD-006).

La investigación destapó además que la clave elegida era insuficiente en sí misma: Mercado Pago
emite **varias notificaciones distintas sobre el mismo pago** (`payment.created`,
`payment.updated`), cada una con su propio identificador, y reintenta a los 0, 15 y 30 min,
6 h, 48 h, 96 h y luego cada 96 h **hasta recibir un 2xx** (timeout de 22 s por intento).

---

## Solución

| Cambio | Detalle |
|---|---|
| Clave de deduplicación | `eventId` → `paymentId`, presente en los cuatro proveedores |
| Cobertura | Desaparece la rama sin protección: MP, Stripe y Hey Banco quedan cubiertos |
| Migración | `event_id` → `payment_id` como **`ALTER TABLE … RENAME COLUMN`** escrito a mano |
| Contrato | `eventId` retirado de `WebhookResult` (introducido por PT-076, sin fusionar) |
| Fail-open (AD-02) | Sin `paymentId`: acredita, registra error y **no** propaga |
| Propagación (AD-04) | Los fallos de acreditación propagan en los cuatro proveedores |
| Documentación | ADR-027 sustituye a ADR-025; TD-006 cerrada |

### Por qué la migración se escribió a mano

`prisma migrate dev` proponía `DROP COLUMN` + `ADD COLUMN`, que **habría destruido las reservas
ya registradas**, y además exigía confirmación interactiva. Un `RENAME COLUMN` explícito
preserva los datos y expresa la intención real.

---

## Resultados

| Comprobación | Resultado |
|---|---|
| `npm test` (API) | ✅ **45 suites / 259 tests, 0 fallos** |
| `npm test` (CORE) | ✅ 8 suites / 134 tests |
| `npm run typecheck` | ✅ verde |
| `npm run lint:check` | ✅ 0 errores (721 warnings preexistentes) |
| `prisma migrate status` | ✅ `Database schema is up to date!` |

### Esquema verificado en la fuente real

```
    Column    |           Type           | Nullable |      Default
--------------+--------------------------+----------+-------------------
 payment_id   | character varying(255)   | not null |
Indexes:
    "processed_webhook_events_provider_payment_id_key" UNIQUE, btree (provider, payment_id)
```

---

## Criterios de éxito

| # | Criterio | Estado | Verificado por |
|---|---|---|---|
| 1 | Reentrega no acredita dos veces, en los 4 proveedores | ✅ | D-01..D-04, D-05 |
| 2 | Dos notificaciones distintas del mismo pago acreditan una vez | ✅ | D-06, D-07 |
| 3 | Dos pagos distintos acreditan por separado | ✅ | D-08, D-09, D-10 |
| 4 | Entregas concurrentes acreditan una vez | ✅ | D-11, D-12 |
| 5 | Los tests de PT-076 siguen verdes | ✅ | 45/259 |
| 6 | Suite, typecheck y lint sin errores | ✅ | — |
| 7 | Esquema real verificado | ✅ | consulta a PostgreSQL |

**7 de 7.** PT-078 no requirió credenciales de ningún proveedor.

---

## Un fallo que confirmó el arreglo

Al ejecutar la suite completa, `webhook-credit.spec.ts` (el test de acreditación de MP de
PT-064) empezó a fallar con `Cannot read properties of undefined (reading 'create')`.

Ese test mockeaba `PrismaService` como `{}`. Falló **precisamente porque Mercado Pago pasa
ahora por la reserva de deduplicación**, que es el objetivo del PT. Es la mejor confirmación
disponible de que el cambio surte efecto sobre MP y no solo sobre PayPal. Se actualizó el
fixture del test; no hubo cambio de producto motivado por ese fallo.

---

## Self-Review

- [x] Causa raíz identificada, incluida la insuficiencia de la clave original.
- [x] Los 7 criterios de éxito verificados.
- [x] Tests escritos en RED (13) antes de la implementación.
- [x] Guardas de regresión de importe (T-26..T-30) intactas y verdes.
- [x] Migración no destructiva; esquema comprobado en la BD real, no por inferencia.
- [x] Commit atómico, con convención, trazable a PT-078.
- [x] Sin artefactos de depuración.
- [x] Documentación: ADR-027 sustituye a ADR-025; TD-006 cerrada.
- [x] Deltas: ninguno respecto al Proposal Package aprobado.

---

## Limitaciones conocidas

1. **Verificación solo unitaria.** No se ha comprobado contra pasarelas reales; llegará con
   PT-076.15/.16. Los mocks reproducen el contrato documentado, no el comportamiento real.
2. **Hey Banco sin credenciales ni uso real**: su `paymentId` (`reference`) se cubre por test
   unitario, pero no se ha observado tráfico real.
3. **Stripe usa `client_reference_id`**, que es nuestra referencia y no un id del proveedor.
   Sirve como clave por ser único por intento, pero su semántica difiere. Registrado en
   `out-of-scope.md` nº 4.
4. **La tabla crece sin purga.** Registrado en `out-of-scope.md` nº 1.
5. **Los depósitos ya perdidos** por la pérdida silenciosa anterior no se recuperan.

---

## Estado

**VALIDATION_PENDING** — es un BUG; requiere validación humana para pasar a CLOSED.
**No puede fusionarse antes que PT-076**, del que depende.

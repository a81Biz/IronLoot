# PT-076.1 — Línea base de regresión

**Fecha**: 2026-07-25
**Rama**: `feature/PT-076-paypal-orders-v2` (recién creada, **0 cambios de código**)
**Commit base**: `e004844` (master)

Esta captura se toma **antes** de modificar cualquier código compartido, para poder demostrar ausencia de regresión al cerrar PT-076.

---

## Resultados

| Comando | Resultado |
|---|---|
| `npm run typecheck` | ✅ **Verde** — exit 0, sin errores |
| `npm run lint:check` | ⚠️ **0 errores**, 694 warnings (todos preexistentes, mayoría `no-console`) |
| `npm test` (completo) | ❌ **41 suites: 40 pasan, 1 falla** — 201 tests: 180 pasan, **21 fallan** |
| `npx jest --testPathPattern="(payment\|wallet)"` | ✅ **Verde** — 11 suites, 38 tests, 0 fallos |

---

## Fallo preexistente detectado (NO causado por PT-076)

**Suite**: `test/unit/users/users.service.spec.ts`
**Tests afectados**: 21
**Error**:

```
Nest can't resolve dependencies of the UsersService
(PrismaService, StructuredLogger, RequestContextService, MetricsService, AuditPersistenceService, ?).
Please make sure that the argument KycService at index [5] is available in the RootTestModule context.
```

**Causa**: `UsersService` recibió a `KycService` como sexta dependencia de constructor —
previsiblemente durante el trabajo de KYC del retiro del vendedor (PT-069..072)— sin que el
módulo de pruebas de `users.service.spec.ts` fuese actualizado para proveerlo.

**Verificación de que es preexistente**: la rama se creó desde `master` y en este momento
tiene **cero modificaciones de código fuente**. El fallo está en `master`.

**Ámbito**: módulo `users`. **Sin relación alguna con `payments`, `wallet` ni PayPal.**

**Impacto sobre PT-076**: no afecta a la superficie de cambio de este PT, pero **impide
cumplir literalmente el criterio de éxito nº 5** de `PLAN_ACTUAL.md` ("`npm test` en verde").
Requiere decisión del humano — ver `HANDOFF.md`.

---

## Base de comparación para la regresión

La comparación de regresión de PT-076 se hace contra:

```
npx jest --testPathPattern="(payment|wallet)" --no-coverage
→ 11 suites / 38 tests / 0 fallos
```

Ese es el conjunto que cubre el código compartido que PT-076 modifica
(`payments.service.ts`, interfaces de proveedor, acreditación de wallet).

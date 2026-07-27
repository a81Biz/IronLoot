# PT-077 — Evidencia y Self-Review

**PT-077** | 2026-07-25 | **BUG** | **TRIVIAL** | Rama: `fix/PT-077-users-spec-kyc-mock`

---

## Problema

`test/unit/users/users.service.spec.ts` fallaba entero (21 tests) en `master`:

```
Nest can't resolve dependencies of the UsersService
(PrismaService, StructuredLogger, RequestContextService, MetricsService, AuditPersistenceService, ?).
Please make sure that the argument KycService at index [5] is available in the RootTestModule context.
```

**Causa raíz**: PT-069 introdujo la puerta de KYC obligatorio en `enableSeller()`
(`users.service.ts:340-341`, `this.kyc.getUserKycStatus()` / `this.kyc.isApproved()`),
añadiendo `KycService` como sexta dependencia del constructor de `UsersService`
(`users.service.ts:49`). El módulo de pruebas de `users.service.spec.ts` nunca se
actualizó para proveerla, de modo que Nest no podía instanciar el servicio y **las
21 pruebas del fichero fallaban en el `beforeEach`**, no por lógica de negocio.

**Detectado en**: PT-076.1 (captura de línea base de regresión).

---

## Solución

Únicamente código de pruebas. **Cero cambios en código de producto.**

1. Import de `KycService` en el spec.
2. `mockKycService` con `getUserKycStatus` → `'APPROVED'` e `isApproved` → `true`.
   Se simula KYC aprobado por defecto para no alterar las expectativas previas del
   suite (el test "should enable seller status when all requirements are met" fue
   escrito antes de que existiera la puerta KYC).
3. Registro del mock como provider del `TestingModule`.

`jest.clearAllMocks()` del `beforeEach` conserva las implementaciones simuladas
(`mockClear` no borra implementación, a diferencia de `mockReset`), por lo que los
valores por defecto sobreviven entre tests.

---

## Resultados

| Comando | Antes (línea base PT-076.1) | Después |
|---|---|---|
| `npx jest --testPathPattern="users.service"` | ❌ 21 fallos | ✅ **21 pasan** |
| `npm test` (completo) | ❌ 41 suites: 40 ✅ / 1 ❌ — 201 tests: 180 ✅ / **21 ❌** | ✅ **41 suites / 201 tests, 0 fallos** |
| `npm run typecheck` | ✅ verde | ✅ verde |
| `npm run lint:check` | 0 errores / 694 warnings | 0 errores / **694 warnings (sin cambio)** |

---

## Self-Review

- [x] **Causa raíz identificada y documentada** — dependencia de constructor añadida en PT-069 sin actualizar el módulo de pruebas.
- [x] **Criterio de aceptación verificado** — `npm test` completo en verde.
- [x] **Sin efectos colaterales** — el cambio se limita a un fichero de pruebas; ningún fichero de `src/` modificado.
- [x] **Convenciones respetadas** — patrón de mock idéntico al ya usado en el mismo fichero para los otros cinco providers.
- [x] **Commit atómico** — un solo cambio lógico, prefijo `test:`, trazable a PT-077.
- [x] **Sin artefactos de depuración** — sin `console.log` ni código comentado.
- [x] **Documentación** — no hay API pública modificada; no procede.
- [x] **Sin regresión** — warnings de lint idénticos (694), typecheck idéntico, resto de suites intactas.

---

## Deuda detectada (NO corregida aquí — fuera del alcance TRIVIAL)

**La puerta de KYC de `enableSeller()` no tiene cobertura de test.** El mock devuelve
`APPROVED` siempre; no existe ningún test que verifique el camino de rechazo
(`ValidationException` con `'KYC approval required to become a seller'`) que PT-069
introdujo. Es una regla de negocio real sin verificar.

Se registra como candidata para FPGE. Añadirla aquí habría excedido el alcance
acordado para PT-077.

---

## Estado

**VALIDATION_PENDING** — es un BUG; requiere validación humana para pasar a CLOSED.

# PT-079 — Evidencia y Self-Review

**PT-079** | 2026-07-25 | **BUG** | **TRIVIAL** | Rama: `fix/PT-079-kyc-gate-coverage`

---

## Problema

La puerta de KYC obligatorio de `enableSeller()` (`users.service.ts:340-341`, ADR-021 / RN-62,
introducida por PT-069) **no se ejercitaba en ningún test**. El mock de `KycService` añadido
por PT-077 devolvía `APPROVED` de forma fija, de modo que todos los tests recorrían la rama
feliz y el camino de rechazo quedaba sin verificar.

No había defecto de comportamiento: el producto **sí** aplica la regla. El defecto estaba en
la red de seguridad — eliminar la puerta no habría roto ningún test.

Registrado como TD-007 durante PT-077.

---

## Solución

Solo código de pruebas. **Cero cambios en código de producto** (verificado: `git status`
únicamente reporta el fichero `.spec.ts`).

1. El mock de `KycService` pasa de valor fijo a configurable por test. `isApproved` replica la
   lógica real (`status === 'APPROVED'`), así que basta con fijar el estado.
2. Los valores por defecto se restablecen en cada `beforeEach`, para que un test que fuerce el
   rechazo no contamine a los siguientes (`jest.clearAllMocks()` **no** borra implementaciones,
   solo el historial de llamadas — sin esto habría fugas entre tests).
3. Cinco casos nuevos: KYC `PENDING`, `REJECTED`, ausente (`NOT_SUBMITTED`), detalle del
   requisito faltante, y orden de evaluación respecto a los requisitos de perfil.

---

## Resultados

| Comprobación | Antes | Después |
|---|---|---|
| `users.service.spec.ts` | 21 tests | ✅ **26 tests, 0 fallos** |
| Tests previos | 21 verdes | ✅ 21 siguen verdes |
| Cambios en `src/` | — | ✅ **ninguno** |

---

## Verificación por mutación (criterio de éxito nº 2)

Un test que pasa no demuestra que proteja algo. Se neutralizó temporalmente la puerta KYC
(`if (false && !this.kyc.isApproved(...))`) y se reejecutó el suite:

```
× PT-079: no habilita vendedor si el KYC está PENDING
× PT-079: no habilita vendedor si el KYC está REJECTED
× PT-079: sin KYC enviado, reporta NOT_SUBMITTED en el detalle del error
× PT-079: el error identifica el KYC como requisito faltante
Tests: 4 failed, 22 passed, 26 total
```

**4 de los 5 casos fallan al eliminar la regla**, lo que demuestra que la protegen de verdad.

El quinto ("los requisitos de perfil se evalúan antes que el KYC") sigue pasando, y es
correcto que así sea: verifica el **orden de evaluación**, no la puerta. Su escenario
—perfil incompleto— lanza antes de llegar a la comprobación de KYC, de modo que es
indiferente a que la puerta exista.

El fichero de producción se restauró y se confirmó idéntico al original.

---

## Self-Review

- [x] Causa raíz identificada y documentada.
- [x] Criterios de éxito verificados, incluido el de mutación.
- [x] Sin efectos colaterales: ningún fichero de `src/` modificado.
- [x] Sin fugas entre tests: valores por defecto restablecidos en `beforeEach`.
- [x] Convenciones respetadas: mismo patrón de mock que el resto del fichero.
- [x] Commit atómico, con convención, trazable a PT-079.
- [x] Sin artefactos de depuración.
- [x] Los 21 tests previos siguen verdes.

---

## Deuda relacionada (NO corregida — fuera del alcance TRIVIAL)

La **misma ADR-021** aplica una puerta de KYC gemela en `withdrawals.request`. No se ha
verificado si tiene cobertura. Otro servicio y otro fichero de test; se decidió en STATE 2
dejarlo fuera (alternativa B2). Candidata para FPGE.

---

## Estado

**VALIDATION_PENDING** — es un BUG; requiere validación humana para pasar a CLOSED.

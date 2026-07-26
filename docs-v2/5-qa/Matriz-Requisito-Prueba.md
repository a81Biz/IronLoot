# Matriz Requisito × Prueba y Cobertura Faltante — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia |
| **Fuente** | `audit/raw/F`, `transversal/Catalogo-Maestro-de-Reglas.md`, suites de test |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | Master Test Plan, Catálogo de Reglas |
| **Código usado** | `src/api/test/*`, `packages/core/**/*.spec.ts` |
| **Nivel de confianza** | Alto |

> Cada regla (`RN-*`) mapeada a su(s) prueba(s). ✅ cubierta · ⚠️ parcial · ✗ sin prueba.

| Regla | Requisito | Prueba(s) | Estado | Hallazgo |
|---|---|---|---|---|
| RN-01/06 | bcrypt, reset revoca sesiones | auth.service.spec (9) + auth.e2e (8) | ✅ | — |
| RN-02 | JWT 15m/7d | auth.service.spec | ✅ | — |
| RN-03/04 | gates de login | auth.service.spec + e2e | ✅ | — |
| RN-07 | 2FA TOTP | auth.service.spec (2FA cluster) | ✅ | — |
| RN-10/11 | crear/publicar subasta desde DRAFT | auctions.service.spec (11) + e2e (6) | ✅ | — |
| RN-13/15 | puja >actual, no-vendedor | bid-validation.spec (6) | ✅ (core) | — |
| RN-14 | incremento mínimo | — | ✗ | AUD-009 |
| RN-16 | estado válido de puja (PUBLISHED/ACTIVE) | — (divergencia no fijada) | ✗ | AUD-012 |
| RN-17 | soft-close | scheduler/bids (parcial) | ⚠️ | AUD-002 |
| RN-22 | hold-first fondos | wallet.service.spec (8) + wallet-calculation.spec (12) | ⚠️ prod (4 bids) | AUD-013 |
| RN-23 | liberar al superado | bids.service.spec (4) | ⚠️ | AUD-013 |
| RN-24 | depósito monto verificado | payments.service.spec (6) + wallet.controller.spec | ⚠️ | — |
| RN-25 | límite retiro | wallet.controller.spec (5) | ⚠️ | — |
| RN-26 | ledger inmutable | wallet.service.spec | ✅ | — |
| RN-30 | cierre + captura | auction-scheduler.spec (3) + scheduler-lock (7) | ⚠️ | AUD-012 |
| RN-31 | comisión | — | ✗ | AUD-005/013 |
| RN-34 | envío requiere PAID | shipments.service.spec (6) + e2e (4) | ✅ | — |
| RN-40 | disputa 14 días | dispute-state-machine.spec (7) + disputes.service.spec (7) | ✅ | — |
| RN-41 | resolución disputa | — | ✗ | AUD-010 |
| RN-42 | reembolso | ProcessRefundUseCase.spec (8) **no cableado** | ✗ prod | AUD-012/013 |
| RN-43 | rating DELIVERED | ratings.service.spec (6) + e2e (6) | ✅ | — |
| RN-50 | webhook: validación de firma | webhook-sig.spec (7) + ipn.spec (11, **obsoleto PT-076**) + paypal-webhook.spec (10, API) | ✅ | — |
| RN-51 | acredita si COMPLETED | payments.service.spec (6) | ⚠️ idempotencia | — |
| RN-52 | rate limiting | (config; sin test específico) | ⚠️ | AUD-004 |
| RN-54 | CSRF | — | ✗ | AUD-014 |
| RN-55 | WS auth | — | ✗ | AUD-006 |
| RN-56 | onboarding vendedor | users.service.spec (21) | ✅ | — |

## Cobertura faltante prioritaria

| # | Área sin prueba | Riesgo | Acción |
|---|---|---|---|
| 1 | commissions (revenue) | Alto/dinero | suite de cálculo/idempotencia |
| 2 | refunds (producción) | Alto/dinero | over-refund, estado inválido, TX |
| 3 | cierre/settlement | Alto/dinero | winner selection, held→charge, release |
| 4 | idempotencia webhook (API) | Alto/seguridad | duplicados, doble crédito |
| 5 | frontend (base/client/admin) | Medio | smoke BFF/auth, flujos de escritura |
| 6 | CSRF / WS auth | Medio/seguridad | tras decidir postura (AUD-014/006) |

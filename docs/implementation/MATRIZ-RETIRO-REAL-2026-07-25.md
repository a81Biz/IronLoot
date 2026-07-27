# Matriz — Retiro real del vendedor (MVP manual/SPEI) → FDGE (2026-07-25)

**Decisiones del usuario:** (1) mecanismo **C = SPEI manual admin** (banco sin dispersión automática; a investigar
después). (2) holdback: liberar por **confirmación de recepción O vencimiento de disputa** (lo que ocurra). (3)
aprobación **siempre manual**. (4) **KYC obligatorio** en esta entrega (cierra OBS-01/PT-061).

**Tipo:** FEATURE (STATE 1-E). **Complejidad global:** MAJOR. Cada PT: ENRICHMENT + Proposal Package + tests-first.

## Cola de procesamiento (por dependencia)

| # | PT | Punto | Entregable | Depende |
|:--:|:--:|---|---|---|
| 1 | ✅ **PT-069** | KYC obligatorio | `POST /api/v1/kyc` (submission) + gate en enable-seller **y** en retiro (KYC=APPROVED). Cierra OBS-01. | — |
| 2 | ✅ **PT-070** | Método de pago bancario real | Migración `user_payment_methods` (banco, CLABE, titular, verificado) + CRUD + validación CLABE; titular ligado a KYC. | PT-069 |
| 3 | ✅ **PT-071** | Retención de liquidación (holdback) | `CREDIT_SALE` entra como **pendiente** (no disponible); job libera a disponible al **confirmar recepción** o **vencer disputa (14d)**. | — |
| 4 | ✅ **PT-072** | Solicitud de retiro + máquina de estados + aprobación admin + PayoutProvider(manual) | Modelo `WithdrawalRequest` (REQUESTED→APPROVED→PROCESSING→PAID / REJECTED / FAILED), endpoints vendedor + admin, `PayoutProvider` (impl manual), ledger `WITHDRAWAL` al confirmar, reversa en FAILED, límites en `system_config`. Gate: KYC + método verificado + saldo liberado. | 069,070,071 |

## Fuera de alcance (declarado)
- Dispersión bancaria **automática** (SPEI vía API): el usuario la investigará; se deja el `PayoutProvider` listo para enchufarla (Fase 2).
- MP Marketplace / disbursement automático.

## Además (oportunista)
- Límite diario de retiro → `system_config` (hoy hardcodeado $5000). Se incluye en PT-072.
- `commission_records` vs ledger `FEE_PLATFORM` (posible desincronización) — se anota, no bloquea.

## Cierre
**2026-07-25** — MVP de retiro real completo (manual/SPEI): KYC obligatorio (cierra OBS-01), métodos bancarios CLABE, holdback de liquidación, y solicitud+aprobación admin+payout. 4 migraciones, 14 tests nuevos + 38 wallet/payments sin regresión. Verificado end-to-end (solicitar→reservar→aprobar→pagar; rechazo reintegra; gates). Commits f7b1d00, ce8d726, 86a04f9, 244b99b, bf73bfd.

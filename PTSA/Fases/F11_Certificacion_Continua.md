# F11 — Certificación Continua

**Estado**: CONFIGURADA  
**Fecha**: 2026-06-23  
**Sesión**: S-001

---

## Certificado de Auditoría — Primera Emisión

```
PTSA-CERT-001
Sistema: IronLoot Auction Platform v1.0.0
Fecha emisión: 2026-06-23
Sesión auditoría: S-001
Health Score: 86.1 / 100
Clasificación: C (capada por freshness UNKNOWN)
Clasificación sin cap: B (tendencia 86.1)
Risk Score: 100 / 100 (CRÍTICO — acumulación de riesgos medios/altos)
Confidence: 55 / 100 (BAJA — primera auditoría, sin logs/DB en vivo)

Limitaciones declaradas:
  BLQ-001: Sin acceso a DB real (verificación via schema.prisma)
  BLQ-002: Sin acceso a logs en vivo (verificación via código fuente)

Firma: PTSA V3 — Sesión S-001 — 2026-06-23
```

---

## Parámetros de Freshness

| Producto | Criticidad | Ciclo Auditoría | Próxima Revisión |
|---|---|---|---|
| P-001 Bid | CRÍTICA | 14 días | 2026-07-07 |
| P-002 AuctionResult | CRÍTICA | 14 días | 2026-07-07 |
| P-004 PaymentWebhook | CRÍTICA | 14 días | 2026-07-07 |
| P-005 WalletTransaction | CRÍTICA | 14 días | 2026-07-07 |
| P-008 AuthToken | CRÍTICA | 14 días | 2026-07-07 |
| P-003 RateLimitResponse | ALTA | 30 días | 2026-07-23 |
| P-006 Order | ALTA | 30 días | 2026-07-23 |
| P-009 CfdiRecord | ALTA | 30 días | 2026-07-23 |
| P-010 PageRenderSSR | ALTA | 30 días | 2026-07-23 |
| P-007 DisputeRecord | MEDIA | 60 días | 2026-08-22 |
| P-011 NotificationRecord | MEDIA | 60 días | 2026-08-22 |
| P-012 CmsContent | BAJA | 90 días | 2026-09-21 |

**audit_due global**: 2026-07-07 (productos CRÍTICOS)

---

## Puntos de Control CI/CD (D2/D3/D5)

Los siguientes checks deben ser automatizados en el pipeline CI:

### D2 — Integridad Arquitectural
```yaml
# Verificación que ThrottlerModule usa Redis storage
check_throttler_redis:
  grep: "ThrottlerStorageRedis" en src/api/src/app.module.ts
  expect: presente (cuando H-002 sea resuelto)

# Verificación de StructuredLogger en PaymentsService
check_payments_logger:
  grep: "StructuredLogger" en src/api/src/modules/payments/payments.service.ts
  expect: presente (cuando H-003 sea resuelto)

# Verificación de EXTENSION_MS hardcoded eliminado
check_bids_soft_close:
  grep: "EXTENSION_MS = 5 \* 60 \* 1000" en src/api/src/modules/bids/bids.service.ts
  expect: ausente (cuando H-001 sea resuelto)
```

### D3 — Observabilidad
```yaml
# Verificar que no hay Logger estándar en servicios financieros
check_financial_loggers:
  grep: "new Logger(" en src/api/src/modules/wallet/
  expect: ausente
  grep: "new Logger(" en src/api/src/modules/payments/
  expect: ausente (cuando H-003 sea resuelto)
```

### D5 — Estabilidad Operacional
```yaml
# Verificar que no hay Float en schema financiero
check_no_float_financial:
  grep: "Float" en src/api/prisma/schema.prisma
  expect: ausente en campos de balance/amount/price
```

---

## Condiciones para Ascenso de Clasificación

Para alcanzar **Clase B** (Health ≥ 75, freshness KNOWN):
1. Resolver H-001 (D1 sube a 85 → Health sube a 90.6)
2. Completar al menos 1 ciclo de delta sync con evidencia observada en vivo (freshness → KNOWN)
3. Mantener D3 ≥ 90

Para alcanzar **Clase A** (Health ≥ 90):
1. Resolver H-001 y H-005 (D1 = 100)
2. Resolver H-002, H-004 (D2 sube a 94)
3. Freshness KNOWN con evidencia en vivo
4. Health proyectado: (100×0.30)+(94×0.30)+(100×0.30)+(99×0.10) = 98.1 → Clase A

---

## Delta Sync Protocol

En próximas sesiones, activar con `resume PTSA` o `continue PTSA`. El delta sync debe:

1. Re-evaluar solo los hallazgos ABIERTOS (H-001 a H-007)
2. Verificar si los cambios de código resolvieron el hallazgo
3. Actualizar estado de hallazgo → CORREGIDA → esperar evidencia → VERIFICADA → CLOSED (solo humano)
4. Recalcular scores con penalizaciones actualizadas
5. Actualizar `score-history.json` con nuevo registro
6. Actualizar `ESTADO_ACTUAL.md`
7. Append a `AUDIT_LOG.md`

**Trigger de delta sync**: Cualquier PR merged que toque archivos en `audit-scope.yaml`.

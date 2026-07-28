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

---

## Update U-004 — DS-004 (2026-07-27)

Delta calculado contra `audit-scope.yaml`: **177 commits, 286 ficheros** en alcance desde
2026-06-23.

```
score_freshness:
  last_verified: 2026-07-27
  commits_since_audit: 177
  status: STALE
```

**STALE** por dos motivos independientes: reauditación parcial (coverage 50 %) y `audit_due`
vencido el 23-jul en los cinco productos CRÍTICOS.

**Hueco detectado en el propio mecanismo**: los cinco documentos de `coverage_targets.docs` están
gitignored, así que `commits_since_audit` **no es calculable** para ellos — no es 0, es
indeterminable. Registrado como **H-009**.

`ci_checkpoints` declara `D2` con «tests + schema + vulnerabilidades». **No hay registro de una
sola ejecución.** Las 71 vulnerabilidades de H-008 son la consecuencia directa.

---

## Update U-006 — S-002 (2026-07-27): la certificación cae a B

### Estado de la certificación

```
score_freshness:
  last_verified: 2026-07-27
  commits_since_audit: 0
  status: FRESH
```

**Clase B.** El sistema deja de estar certificado en A. No por el dominio —D1 sigue en 85 y las 14
reglas cumplen sobre salida real— sino por D2 = 55: dos hallazgos abiertos sobre los mecanismos que
llevan el sistema de este entorno a cualquier otro.

### Los checkpoints declarados, y si corren

| Checkpoint | Dónde | Estado real |
|---|---|---|
| **D2** dependencias | `ci.yml: security-audit` → `npm run audit:check` | ✅ **corre** — sin `needs`, independiente. 0 avisos |
| **D2** tests | `ci.yml: test-unit` | ✅ corre |
| **D2** esquema | `npm run typecheck` + prisma | ✅ limpio |
| **D2** integración | `ci.yml: test-integration` | ⛔ **no puede terminar en verde** — H-015 |
| **D3** observabilidad | `npm run audit:observability` | ✅ manual, verde |
| **D1.N1** reglas de dominio | `npm run audit:domain` | ✅ manual, `rubric = 100` |
| **D5** fiabilidad | `npm run audit:reliability` — delta sync, no CI | ✅ manual, verde |

Cuatro de los siete se ejecutan a mano en cada delta sync. Sólo D2-dependencias y D2-tests corren
solos. **D1.N1 y D3 están declarados como checkpoints en `audit-scope.yaml` pero no tienen job en
`ci.yml`**: se ejecutan porque el auditor los ejecuta. Es exactamente la situación que PT-118
arregló para las dependencias, un escalón más abajo. No se registra como hallazgo aparte —cae
dentro de H-015, que es donde vive el pipeline— pero queda dicho.

### `audit_due` por producto

Política vigente: CRÍTICA 30 d · ALTA 60 d · MEDIA 90 d · BAJA 180 d.
Verificados hoy → los cinco CRÍTICOS (P-001, P-002, P-004, P-005, P-009) vencen el **2026-08-26**.

### Qué haría falta para volver a A

Cerrar H-014 y H-015 devuelve D2 a 100:

```
Health = (85 × 0.30) + (100 × 0.30) + (100 × 0.30) + (95 × 0.10) = 95.0   → Clase A
```

Y cerrando además H-016 (D4 = 100): **95.5**. H-005 por sí solo no impide la A: con D2 en 100, el
Health pasa de 90 aun con el CFDI sin resolver. **Lo que saca al sistema de la A hoy no es el
dominio: es el camino al despliegue.**

### Corrección — H-017

Con H-017 (D2, ALTA), D2 baja a **40** y el Health a **77.0**. Sigue siendo Clase B, ahora por poco.

Cerrar H-014, H-015 y H-017 devuelve D2 a 100:

```
Health = (85×0.30)+(100×0.30)+(100×0.30)+(95×0.10) = 95.0   → Clase A
```

Y con H-016 también cerrado (D4 = 100): **95.5**. Se mantiene la conclusión, ahora con tres piezas
en vez de dos: **lo que saca al sistema de la Clase A no es el dominio, es el camino al despliegue.**

### Segunda corrección — S-002-R2

Con H-016 en ALTA, `D4 = 85` y el Health baja a **76.0**. Clase **B**, sin cambio de clase.

Proyección revisada:

```
cerrando los tres D2:            (85×.30)+(100×.30)+(100×.30)+(85×.10) = 94.0   → Clase A
cerrando ademas H-016 (D4=100):                                        = 95.5   → Clase A
```

Sigue en pie la conclusión, y con más razón: **lo que saca al sistema de la Clase A no es el
dominio.** Es el camino al despliegue y la referencia que lo describe.

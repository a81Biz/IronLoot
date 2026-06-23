---
ptsa_version: 3.0
fase: F3.5
nombre: Criticidad de Productos
estado: COMPLETADA
ultima_actualizacion: 2026-06-23
confidence: 93
sesion: S-001
---

# F3.5 — Criticidad de Productos

**Sistema:** IronLoot v1.0.0  
**Fecha:** 2026-06-23  
**Fuente:** F-1 (reglas de dominio), F3 (catálogo de productos), PRD, conocimiento de impacto de negocio

---

## 1. Matriz de Criticidad

| ID | Producto | Clase | Criticidad | Justificación | `audit_due` |
|:---|:---|:--:|:--:|:---|:---|
| P-001 | Bid — Puja colocada | primario | **CRÍTICA** | Involucra bloqueo de fondos reales (MXN). Fallo = pérdida de dinero del usuario o bid inválido | ≤ 30 días |
| P-002 | Auction Close — Cierre de subasta | primario | **CRÍTICA** | Determina el ganador, crea el pedido y redistribuye fondos. Fallo = fraude o pérdida financiera | ≤ 30 días |
| P-003 | Order — Pedido | primario | **ALTA** | Registro de transacción comercial. Fallo = disputas no resolubles, falta de trazabilidad | ≤ 60 días |
| P-004 | Payment — Pago procesado | primario | **CRÍTICA** | Involucra movimiento real de dinero vía proveedor externo. Fallo sin validación HMAC = fraude | ≤ 30 días |
| P-005 | Wallet Transaction — Transacción monedero | primario | **CRÍTICA** | Saldo negativo o ledger incorrecto = inconsistencia financiera permanente | ≤ 30 días |
| P-006 | Dispute — Disputa | primario | **ALTA** | Resolución de conflicto post-entrega. Fallo = usuario sin recurso legal/operativo | ≤ 60 días |
| P-007 | Notification — Notificación | primario | **MEDIA** | Comunicación. Fallo degrada UX pero no invalida la transacción | ≤ 90 días |
| P-008 | JWT Auth Token | primario | **ALTA** | Acceso al sistema. Token inválido = DoS funcional; token comprometido = violación de seguridad | ≤ 60 días |
| P-009 | Ledger Entry | secundario | **CRÍTICA** | Registro inmutable financiero. Ausencia = violación de regla CR-003 (trazabilidad obligatoria) | ≤ 30 días |
| P-010 | Commission Record | secundario | **MEDIA** | Trazabilidad de comisiones de plataforma. Importante pero no bloquea transacciones | ≤ 90 días |
| P-011 | KYC Submission | primario | **ALTA** | Habilitación de vendedores. Fallo = vendedores sin verificar pueden operar sin KYC | ≤ 60 días |
| P-012 | CFDI Record | secundario | **BAJA** | Stub — no funcional en v1.0.0. Impacto fiscal futuro pero sin impacto operativo actual | ≤ 180 días |

---

## 2. Resumen de distribución de criticidad

| Criticidad | Count | Productos |
|:--:|:--:|:---|
| CRÍTICA | 5 | P-001, P-002, P-004, P-005, P-009 |
| ALTA | 4 | P-003, P-006, P-008, P-011 |
| MEDIA | 2 | P-007, P-010 |
| BAJA | 1 | P-012 |

---

## 3. Priorización de auditoría

Orden de profundidad en F6 (Domain Acid Test):
1. **CRÍTICA** — P-001, P-002, P-004, P-005, P-009 (primero)
2. **ALTA** — P-003, P-006, P-008, P-011 (segundo)
3. **MEDIA** — P-007, P-010 (tercero)
4. **BAJA** — P-012 (stub — verificar que no compromete integridad) (último)

---

## Checklist F3.5 ✅

- [x] Toda criticidad justificada por impacto de negocio
- [x] Ninguna criticidad uniforme sin justificación
- [x] `audit_due` asignado por criticidad según política estándar
- [x] Campo `criticidad` actualizado en cada `P-XXX.md`

**Estado: COMPLETADA** | Confidence: 93%

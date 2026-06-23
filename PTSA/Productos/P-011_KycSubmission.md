---
producto_id: P-011
nombre: KYC Submission — Verificación KYC
clase: primario
criticidad: ALTA
estado: BORRADOR
dimension_primaria: D1
confidence: 0
audit_due: 2026-08-22
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: null
  cross_coherence_verified: false
hallazgos_relacionados: []
---

# P-011 — KYC Submission (Verificación de vendedor)

## Descripción
Una verificación KYC es el proceso de validación de identidad que un usuario debe completar para habilitarse como vendedor. Estados: PENDING → APPROVED / REJECTED / CORRECTION_NEEDED. Sin KYC aprobado, el usuario no puede crear subastas.

**Consumidor:** Vendedor (habilitado para vender), Admin (gestión de verificaciones).

## Fuente de generación
- **Servicio:** `KycService.submit()`, `KycService.approve()`, `KycService.reject()`
- **Tabla:** `kyc_submissions`

## Cadena de trazabilidad
```
P-011 KYC Submission
  ← KycService.submit() [transformación]
  ← KycController POST /kyc [servicio]
  ← Reglas: user.isSeller verificado solo si KYC=APPROVED
  ← Fuente: users WHERE id=? (userId)
  ← Acción usuario: Vendedor envía documentos KYC
```

## Invariantes de dominio verificados en F6

| Regla | Estado | Evidencia |
|:---|:--:|:---|
| Usuario sin KYC aprobado no puede habilitar vendedor | ⏳ Pendiente F6 | — |
| Estado inicial = PENDING | ⏳ Pendiente F6 | — |
| Solo admin puede cambiar a APPROVED/REJECTED | ⏳ Pendiente F6 | — |

## Estado de validación
`BORRADOR` — pendiente F6

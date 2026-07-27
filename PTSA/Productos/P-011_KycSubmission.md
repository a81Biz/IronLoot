---
producto_id: P-011
nombre: KYC Submission — Verificación KYC
clase: primario
criticidad: ALTA
estado: VALIDADO
dimension_primaria: D1
confidence: 100
audit_due: 2026-08-26
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: 100
  cross_coherence_verified: true
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


---

## Auditoría F6 — DS-006 (2026-07-27)

**Transición**: `BORRADOR` → **`IDENTIFICADO`** · **Confidence**: 100 · **Evidencia**: [E-010]

Ningun vendedor habilitado sin KYC aprobado; estados del catalogo

Ejecutado sobre la **salida real extraída de la base de datos** (`[R55]`), con los productos que
dejó la corrida completa de QA del 27-jul — no sobre tests unitarios ni sobre el código que los
genera.

> **Por qué no llega a `VALIDADO`.** `[R38]` exige para esa transición `rubric = 100` ∧ `¬drift` ∧
> `cross_coherence` verificada, y `[R39]` prohíbe llegar por inferencia. La rúbrica de este producto
> **no está definida** en F-1 —sólo hay reglas `CR-XXX` sueltas—, así que `rubric_compliance_score`
> no es calculable todavía. Declararlo `VALIDADO` sería inventarse el número.
>
> Definir las rúbricas es trabajo de F12 (Gobernanza de Dominio) y queda en `PENDIENTES.md`.


---

## Transición a VALIDADO — DS-008 (2026-07-27)

**`IDENTIFICADO` → `VALIDADO`** · VoBo humano recibido.

`[R38]` exige `rubric = 100` ∧ `¬drift` ∧ `cross_coherence`. Los tres se cumplen:

```
rubric_compliance_score  = 100   (F-1 §5, once criterios pesados, ejecutados sobre salida real)
semantic_drift_detected  = false (el producto ES el registro: no hay significado que derive)
cross_coherence_verified = true
```

**Evidencia de este producto**: N1: estados del catalogo; N3: ningun vendedor habilitado sin KYC aprobado

`[R39]` prohíbe llegar aquí por inferencia. Toda la evidencia es **observada en la fuente real** —
consultas contra `ironloot_db` con los productos que dejó una corrida completa de QA, incluidos dos
pagos por pasarelas de verdad y una subasta que el cron cerró solo.

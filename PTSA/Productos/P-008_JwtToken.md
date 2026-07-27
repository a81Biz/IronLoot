---
producto_id: P-008
nombre: JWT Authentication Token
clase: primario
criticidad: ALTA
estado: IDENTIFICADO
dimension_primaria: D2
confidence: 100
audit_due: 2026-08-26
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: null
  cross_coherence_verified: false
hallazgos_relacionados: []
---

# P-008 — JWT Authentication Token

## Descripción
Un JWT de acceso es emitido tras autenticación exitosa y permite al usuario operar en el sistema durante su vida útil (15 minutos por defecto). Incluye payload `{ id, email, state, isSeller, ... }`. El refresh token (7 días) permite renovar el acceso sin re-autenticarse.

**Consumidor:** Cualquier usuario autenticado (todos los endpoints JWT-protected).

## Fuente de generación
- **Endpoint:** `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`
- **Servicio:** `AuthService.login()`, `AuthService.refresh()`
- **Tabla:** `sessions` (refresh tokens), `users` (state)

## Cadena de trazabilidad
```
P-008 JWT Token
  ← AuthService.login() + JwtService.sign() [transformación]
  ← AuthController POST /auth/login [servicio]
  ← Reglas: CR-011 (JWT_SECRET no placeholder), CR-012 (expira en JWT_ACCESS_EXPIRY), CR-013 (estado ACTIVE)
  ← Fuente: users WHERE email=? (bcrypt.compare para contraseña), sessions (refresh token storage)
  ← Acción usuario: POST /auth/login con { email, password }
```

## Invariantes de dominio verificados en F6

| Regla | Estado | Evidencia |
|:---|:--:|:---|
| CR-011: JWT_SECRET no es placeholder en producción | ⏳ Pendiente F5 | — |
| CR-012: access token expira en JWT_ACCESS_EXPIRY (15m default) | ⏳ Pendiente F6 | — |
| CR-013: cuenta no verificada → 403 USER_NOT_VERIFIED | ⏳ Pendiente F6 | — |
| Cuenta suspendida/banned → 403 | ⏳ Pendiente F6 | — |
| 2FA: si habilitado, requiere TOTP antes de emitir token | ⏳ Pendiente F6 | — |
| Email-enumeration: forgot-password retorna success independientemente | ⏳ Pendiente F6 | — |
| Refresh token almacenado en DB (sessions table), revocable en logout | ⏳ Pendiente F6 | — |

## Estado de validación
`BORRADOR` — pendiente F5/F6

## Notas de coherencia inter-producto
- P-008 es prerrequisito para todos los demás productos que requieren JWT
- Dimensión primaria D2 (seguridad arquitectónica) en lugar de D1 porque el valor del token es de acceso/seguridad, no de dominio de negocio directo


---

## Auditoría F6 — DS-006 (2026-07-27)

**Transición**: `BORRADOR` → **`IDENTIFICADO`** · **Confidence**: 100 · **Evidencia**: [E-010]

21 sesiones: todas con caducidad, 0 caducadas vivas, 0 tokens repetidos, guardadas como hash de 64 hex

Ejecutado sobre la **salida real extraída de la base de datos** (`[R55]`), con los productos que
dejó la corrida completa de QA del 27-jul — no sobre tests unitarios ni sobre el código que los
genera.

> **Por qué no llega a `VALIDADO`.** `[R38]` exige para esa transición `rubric = 100` ∧ `¬drift` ∧
> `cross_coherence` verificada, y `[R39]` prohíbe llegar por inferencia. La rúbrica de este producto
> **no está definida** en F-1 —sólo hay reglas `CR-XXX` sueltas—, así que `rubric_compliance_score`
> no es calculable todavía. Declararlo `VALIDADO` sería inventarse el número.
>
> Definir las rúbricas es trabajo de F12 (Gobernanza de Dominio) y queda en `PENDIENTES.md`.

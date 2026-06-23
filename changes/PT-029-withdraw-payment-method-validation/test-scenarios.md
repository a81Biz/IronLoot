# PT-029 — Test Scenarios

---

## TS-029-01: Withdraw con referenceId no registrado → 400 (happy path del fix)

**Contexto**: Usuario autenticado, saldo suficiente, referenceId no existe en `user_payment_methods`.

**Precondición**: `prisma.userPaymentMethod.findFirst()` → null

**Acción**: `POST /api/v1/wallet/withdraw { amount: 100, referenceId: 'mp_unknown_ref' }`

**Resultado esperado**: `400 Bad Request { message: 'Invalid payment method' }`

---

## TS-029-02: Withdraw con referenceId registrado para el usuario → procede

**Contexto**: Usuario con método registrado, saldo suficiente, dentro del límite diario.

**Precondición**: `prisma.userPaymentMethod.findFirst()` → `{ id: '...', userId, referenceId, isActive: true }`

**Acción**: `POST /api/v1/wallet/withdraw { amount: 100, referenceId: 'mp_valid_ref' }`

**Resultado esperado**: `201 { ... }` (retiro procesado)

---

## TS-029-03: Withdraw con referenceId de otro usuario → 400

**Contexto**: referenceId existe en DB pero pertenece a un userId diferente.

**Precondición**: `prisma.userPaymentMethod.findFirst({ where: { userId: req.user.id, referenceId, isActive: true } })` → null (query filtra por userId)

**Acción**: `POST /api/v1/wallet/withdraw { amount: 100, referenceId: 'mp_other_user_ref' }`

**Resultado esperado**: `400 Bad Request { message: 'Invalid payment method' }`

---

## TS-029-04: Withdraw con método inactivo (isActive: false) → 400

**Contexto**: Usuario tiene el método registrado pero `isActive: false`.

**Precondición**: `prisma.userPaymentMethod.findFirst({ where: { ..., isActive: true } })` → null

**Acción**: `POST /api/v1/wallet/withdraw { amount: 100, referenceId: 'mp_inactive_ref' }`

**Resultado esperado**: `400 Bad Request { message: 'Invalid payment method' }`

---

## TS-029-05: getUserPaymentMethod() — unit tests

**Test A**: `getUserPaymentMethod('user1', 'ref_not_exists')` → null (prisma mock devuelve null)

**Test B**: `getUserPaymentMethod('user1', 'ref_valid')` → objeto UserPaymentMethod

**Test C**: `getUserPaymentMethod('user1', 'ref_inactive')` → null (isActive: false filtrado por query)

---

## TS-029-06: Schema — uniqueness constraint

**Contexto**: Intentar crear dos `UserPaymentMethod` para el mismo `userId + referenceId`.

**Resultado esperado**: Prisma lanza `PrismaClientKnownRequestError` P2002 (unique constraint violation).

---

## TS-029-07: Regresión — deposit no afectado

**Acción**: `POST /api/v1/wallet/deposit { amount: 100, referenceId: 'PAY-...' }` (flujo existente)

**Resultado esperado**: Flujo de depósito sin cambios. La validación de payment method solo aplica a withdraw.

---

## TS-029-08: Regresión — suite completa sin failures

**Acción**: `npm test` desde `src/api/`

**Resultado esperado**: Exit 0, sin failures. Tests de withdraw existentes deben actualizar mocks para incluir `getUserPaymentMethod()`.

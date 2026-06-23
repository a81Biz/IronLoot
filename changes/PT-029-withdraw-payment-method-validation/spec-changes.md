# PT-029 — Specification Changes

---

## Cambios en schema Prisma

### schema.prisma
Nuevo modelo `UserPaymentMethod` (ver design.md). Relación inversa `paymentMethods UserPaymentMethod[]` en `User`.

### Migration
`prisma/migrations/YYYYMMDDHHMMSS_add_user_payment_methods/migration.sql` — creada automáticamente.

---

## Cambios en API pública

### `POST /api/v1/wallet/withdraw`

**Comportamiento anterior** (con validación comentada):
- `referenceId` no verificado contra DB
- Cualquier string es aceptado como destino de retiro

**Comportamiento nuevo**:
- `referenceId` validado contra `user_payment_methods` donde `userId = req.user.id AND isActive = true`
- Si no existe → `400 Bad Request { message: 'Invalid payment method' }`

**Cambio de breaking**: Sí — clientes existentes con `referenceId` no registrado recibirán 400. Aceptable porque el comportamiento anterior era incorrecto (H-004 bug).

---

## Cambios en documentación de arquitectura

### 08-API-Catalog.md (docs/enterprise-documentation/ — disco local)
Actualizar endpoint `POST /wallet/withdraw` — agregar la nueva validación como comportamiento documentado.

### 02-PRD.md (docs/enterprise-documentation/ — disco local)
En sección de Wallet, agregar: "Métodos de pago deben estar registrados en `user_payment_methods` para poder procesar retiros."

### HISTORY.log
Entrada PT-029 al completar STATE 7.

---

## Sin cambios en

- `GET /wallet/balance`, `GET /wallet/history`, `POST /wallet/deposit` — no afectados
- Otros módulos — no afectados
- Auth guards — no afectados

# PT-029 — Tasks
## Withdraw: validación de método de pago comentada → Implementada

**Branch**: `fix/PT-029-withdraw-payment-method-validation`

---

## PT-029.1 — Escribir tests que fallen (RED)

**Objetivo**: Tests que verifican el comportamiento correcto ANTES de implementar.
**Inputs**: `src/api/test/unit/payments/payments.service.spec.ts`, `src/api/test/unit/wallet/wallet.controller.spec.ts`
**Outputs**:
- Test A: `getUserPaymentMethod('user1', 'ref_not_exists')` → null (FAIL — método no existe aún)
- Test B: `POST /wallet/withdraw { referenceId: 'ref_not_exists' }` → 400 (FAIL — validación comentada)
**Validation**: `npx jest --testPathPattern="payments.service|wallet.controller" --no-coverage` → FAIL

**Status**: PENDING

---

## PT-029.2 — Agregar modelo UserPaymentMethod a schema.prisma

**Objetivo**: Definir la tabla de métodos de pago de usuario en Prisma.
**Inputs**: `src/api/prisma/schema.prisma`
**Outputs**:
```prisma
model UserPaymentMethod {
  id          String   @id @default(cuid())
  userId      String
  provider    String
  referenceId String
  label       String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, referenceId])
  @@index([userId])
  @@map("user_payment_methods")
}
```
Y en `model User`: agregar `paymentMethods UserPaymentMethod[]`
**Validation**: `npx prisma validate` → sin errores de schema

**Status**: PENDING

---

## PT-029.3 — Generar Prisma client

**Objetivo**: Actualizar el cliente Prisma generado con el nuevo modelo.
**Inputs**: `schema.prisma` actualizado
**Outputs**: `@prisma/client` actualizado con `prisma.userPaymentMethod` disponible
**Validation**: `npm run db:generate` → sin errores; `prisma.userPaymentMethod` accesible en TypeScript

**Status**: PENDING

---

## PT-029.4 — Crear y aplicar migration

**Objetivo**: Aplicar la nueva tabla a la DB de desarrollo.
**Inputs**: `schema.prisma` con el nuevo modelo
**Outputs**: Nueva migration en `prisma/migrations/` + tabla `user_payment_methods` en DB
**Validation**: `npm run db:migrate` → migration aplicada exitosamente

**Status**: PENDING

---

## PT-029.5 — Implementar getUserPaymentMethod() en PaymentsService

**Objetivo**: Método que busca el método de pago verificando ownership.
**Inputs**: `src/api/src/modules/payments/payments.service.ts`
**Outputs**:
```typescript
async getUserPaymentMethod(userId: string, referenceId: string) {
  return this.prisma.userPaymentMethod.findFirst({
    where: { userId, referenceId, isActive: true },
  });
}
```
**Validation**: `npx jest --testPathPattern="payments.service" --no-coverage` → Test A PASS

**Status**: PENDING

---

## PT-029.6 — Activar validación en WalletController.withdraw()

**Objetivo**: Descomentar y actualizar la validación de método de pago en el endpoint de retiro.
**Inputs**: `src/api/src/modules/wallet/wallet.controller.ts` líneas 125-127
**Outputs**:
```typescript
const method = await this.paymentsService.getUserPaymentMethod(req.user.id, dto.referenceId);
if (!method) throw new BadRequestException('Invalid payment method');
```
**Validation**: `npx jest --testPathPattern="wallet.controller" --no-coverage` → Test B PASS

**Status**: PENDING

---

## PT-029.7 — Commit atómico + verificación final

**Objetivo**: Commit con todos los cambios, typecheck limpio, tests verdes, no regresiones.
**Inputs**: Cambios en schema.prisma, payments.service.ts, wallet.controller.ts, spec files, migration
**Outputs**:
- Commit schema+migration: `feat: PT-029 add UserPaymentMethod model and migration`
- Commit implementation: `fix: PT-029 activate withdraw payment method validation`
- `npm run typecheck` → 0 errores
- `npm test` → sin regresiones en toda la suite
**Validation**: Output completo de `npm test`

**Status**: PENDING

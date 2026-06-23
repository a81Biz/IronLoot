# PT-029 — Design Document
## Withdraw: validación de método de pago comentada → Implementada

**Fecha**: 2026-06-23 | **Tipo**: BUG STANDARD | **Complexity**: STANDARD

---

## Problema real descubierto en STATE 1-B

La tabla `user_payment_methods` **no existe** en `schema.prisma`. El scaffolding en `wallet.controller.ts` referencia `paymentsService.getUserPaymentMethod()` que tampoco existe en `PaymentsService`. El alcance real incluye:

1. Modelo Prisma + migration
2. Método de servicio
3. Activación de validación en controller

---

## Modelo Prisma: `UserPaymentMethod`

```prisma
model UserPaymentMethod {
  id          String   @id @default(cuid())
  userId      String
  provider    String   // 'MERCADO_PAGO' | 'PAYPAL' | 'STRIPE' | 'HEY_BANCO'
  referenceId String   // Identificador externo del método en el proveedor
  label       String?  // Descripción user-friendly (ej: "MP ****1234")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, referenceId])
  @@index([userId])
  @@map("user_payment_methods")
}
```

**Decisiones de diseño:**
- `@@unique([userId, referenceId])`: un usuario no puede registrar el mismo referenceId dos veces
- `onDelete: Cascade`: si el usuario es eliminado, sus métodos también
- `isActive: Boolean`: soft-delete (no eliminación física) para preservar historial de transacciones
- `provider: String` (no enum): permite agregar proveedores sin migration adicional

---

## PaymentsService: nuevo método

```typescript
async getUserPaymentMethod(userId: string, referenceId: string) {
  return this.prisma.userPaymentMethod.findFirst({
    where: { userId, referenceId, isActive: true },
  });
}
```

`PrismaService` ya está inyectado en `PaymentsService` → sin cambios al módulo.

---

## WalletController: activar validación

```typescript
// Antes (líneas 125-127 — comentado):
// const method = await this.paymentsService.getUserPaymentMethod(req.user.id, dto.referenceId);
// if (!method) throw new BadRequestException('Invalid payment method');

// Después:
const method = await this.paymentsService.getUserPaymentMethod(req.user.id, dto.referenceId);
if (!method) throw new BadRequestException('Invalid payment method');
```

---

## Archivos afectados

| Archivo | Cambio | Tipo |
|---|---|---|
| `src/api/prisma/schema.prisma` | Nuevo modelo `UserPaymentMethod` | Schema |
| `src/api/src/modules/payments/payments.service.ts` | Nuevo método `getUserPaymentMethod()` | Implementation |
| `src/api/src/modules/wallet/wallet.controller.ts` | Descomentar validación de método de pago | Implementation |
| `src/api/test/unit/payments/payments.service.spec.ts` | Tests de `getUserPaymentMethod()` | Test |
| `src/api/test/unit/wallet/wallet.controller.spec.ts` | Tests de withdraw con validación | Test |

---

## Seguridad y boundary conditions

| Escenario | Comportamiento |
|---|---|
| `referenceId` pertenece al usuario, `isActive: true` | ✅ Continúa al límite diario |
| `referenceId` no existe en DB | ❌ 400 `Invalid payment method` |
| `referenceId` pertenece a otro usuario | ❌ 400 (query filtra por `userId`) |
| `referenceId` pertenece al usuario, `isActive: false` | ❌ 400 (query filtra por `isActive: true`) |

La query `findFirst({ where: { userId, referenceId, isActive: true } })` garantiza ownership atómicamente — no hay TOCTOU (verificación y uso se hacen en el mismo paso DB).

---

## Schema relation con User

`User` model en `schema.prisma` debe agregar la relación inversa:
```prisma
// En model User existente:
paymentMethods UserPaymentMethod[]
```

---

## Nota sobre DAILY_LIMIT hardcodeado

`const DAILY_LIMIT = 5000;` en `wallet.controller.ts` también está hardcodeado. **Out-of-scope** para este PT — registrado en out-of-scope.md.

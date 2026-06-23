# PT-029 — Out of Scope

---

Los siguientes elementos quedan **explícitamente excluidos** de este PT:

1. **CRUD de métodos de pago de usuario**: No se implementan endpoints `POST /wallet/payment-methods`, `GET /wallet/payment-methods`, `DELETE /wallet/payment-methods/:id`. El registro de métodos es responsabilidad de un PT futuro.

2. **UI para gestión de métodos de pago**: Las vistas en `src/apps/client/` para agregar/eliminar métodos de pago quedan fuera.

3. **DAILY_LIMIT hardcodeado (5000 MXN)**: También está en `wallet.controller.ts`. Requiere su propio PT (similar alcance a PT-026 — leer desde SystemConfig).

4. **Validación contra el proveedor externo**: No se verifica que el `referenceId` exista en Mercado Pago / PayPal / etc. Solo se verifica que esté registrado en nuestra DB.

5. **Seeding de métodos de pago en tests de integración**: Los tests unitarios mockean `prisma.userPaymentMethod` directamente. No se crea seed de DB para tests E2E.

6. **Soft-delete API para isActive**: El campo `isActive` existe pero no se expone ningún endpoint para desactivar métodos en este PT.

7. **Soporte multi-proveedor avanzado** (validaciones específicas por proveedor, webhooks de alta/baja): Fuera de alcance. El `provider` se almacena como string plano.

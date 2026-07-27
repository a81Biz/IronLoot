# PT-063 — Tasks
- PT-063.1 Test (RED): verificar `IS_PUBLIC` en `PaymentsController.webhook` (falla sin @Public).
- PT-063.2 Impl (GREEN): `@Public()` + import en payments.controller.ts.
- PT-063.3 Evidencia: POST webhook sin JWT ya no 401-auth (prueba real acreditó).
Estado: DONE.

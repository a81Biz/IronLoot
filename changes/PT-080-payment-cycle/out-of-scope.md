# out-of-scope.md — PT-080

Regla adoptada en este ciclo: **nada se «registra como deuda».** Todo lo que queda fuera sale con
un PT numerado y una razón estructural.

---

## Fuera, con PT asignado

| # | Qué | Por qué no aquí | PT |
|---|---|---|---|
| 1 | `dist/` obsoleto de CORE: `ProcessPaymentUseCase` está documentado en `06-Backend-Architecture.md:169` pero **su fuente no existe** | Es limpieza de CORE y corrección documental; no toca la ruta de pago | **PT-082** |
| 2 | Purga de `processed_webhook_events` y `payment_cycle_event` | Exige política de retención, que es decisión de negocio y afecta a más tablas | **PT-082** |
| 3 | Cobertura de la puerta KYC de `withdrawals.request` (misma ADR-021 que PT-079) | Otro servicio, otro fichero de test | **PT-083** |
| 4 | Resucitar los use-cases de CORE (ADR-008 / AUD-012) | Afecta a los cuatro use-cases, no solo a pagos | **PT-084** |
| 5 | Verificación funcional de **PayPal** contra sandbox (PT-076.15/.16) | Bloqueada por credenciales | **PT-076** (abierto) |

---

## Fuera por naturaleza

| # | Qué | Por qué |
|---|---|---|
| 6 | Túnel público estable | Es infraestructura de pruebas, no arquitectura. La vía garantizada (AD-07) elimina la dependencia |
| 7 | Cambios en `WalletService.deposit()`, ledger o esquema de `wallets` | La acreditación funciona; PT-080 cambia **quién** la invoca y **con qué garantías** |
| 8 | Rediseño de la UI de depósito | Solo cambia el origen de los datos |
| 9 | Migrar a otro proveedor de pago o añadir uno nuevo | La Fase C hace que sea barato; hacerlo no es de este PT |
| 10 | Reembolsos automáticos ante anomalía | PT-080 **crea** el `RefundRequest`; ejecutarlo sigue siendo decisión del admin (ADR-022) |

---

## Riesgos aceptados conscientemente

| # | Riesgo | Por qué se acepta |
|---|---|---|
| 11 | El 401 en firma inválida **puede no detener** los reintentos de Mercado Pago | No está documentado que un 4xx los detenga. Se adopta por corrección semántica y observabilidad, no por esa garantía |
| 12 | La cadencia de consulta (`T+1m…72h`) no se ha validado contra volumen real | No hay producción. Los plazos son revisables sin cambio de arquitectura |
| 13 | Stripe y Hey Banco se migran sin verificación funcional | No tienen credenciales. Queda escrito que su cobertura es solo unitaria |
| 14 | Cambiar el identificador canónico invalida las reservas por id de orden existentes | En desarrollo son 3 filas y **no hay producción**. En producción exigiría plan de datos |

---

## Frontera

- **Sí entra**: que ningún pago cobrado quede sin acreditar ni se acredite dos veces, que las
  notificaciones reales de Mercado Pago se procesen en sus dos formatos, y que añadir o quitar una
  pasarela no obligue a tocar la lógica de transacción.
- **No entra**: retención de datos, reembolso automático, verificación de PayPal, ni resucitar la
  capa de use-cases de CORE.

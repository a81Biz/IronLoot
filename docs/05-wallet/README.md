# 05 - Wallet

Esta sección contiene la documentación del **sistema de Wallet** de IronLoot, el componente central que respalda todas las transacciones económicas de la plataforma.

---

## Documentos

| Archivo | Descripción |
|---------|-------------|
| [01-wallet.md](./01-wallet.md) | Definición funcional completa del sistema Wallet |
| [02-ledger-y-movimientos.md](./02-ledger-y-movimientos.md) | Sistema de registro contable inmutable |
| [03-depositos-y-retiros.md](./03-depositos-y-retiros.md) | Flujos de entrada y salida de fondos |
| [04-casos-limite.md](./04-casos-limite.md) | Edge cases y resolución de conflictos |

---

## Resumen del sistema

El Wallet de IronLoot garantiza que:

* **Toda puja está respaldada** por saldo real del usuario.
* **Todo pago se ejecuta** sin fricción para el ganador.
* **Toda transacción es trazable** en el Ledger.
* **Todo conflicto tiene resolución** definida.

Es el **corazón económico** de la plataforma y la base de la confianza entre usuarios.

---

## Conceptos clave

| Concepto | Descripción |
|----------|-------------|
| **Wallet** | Cuenta interna del usuario con saldo disponible y retenido |
| **Ledger** | Registro inmutable de todos los movimientos financieros |
| **Hold** | Retención temporal de fondos para respaldar una puja |
| **Release** | Liberación de fondos cuando el usuario es superado |
| **Activación** | Depósito mínimo inicial para habilitar operaciones |

---

## Diagrama de relaciones

```
                    ┌─────────────────┐
                    │     Usuario     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Wallet      │
                    │  ┌───────────┐  │
                    │  │ Disponible│  │
                    │  └───────────┘  │
                    │  ┌───────────┐  │
                    │  │ Retenido  │  │
                    │  └───────────┘  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Subastas │  │  Pagos   │  │ Órdenes  │
        │  (Hold)  │  │ (Débito) │  │ (Compra) │
        └──────────┘  └──────────┘  └──────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Ledger      │
                    │  (Inmutable)    │
                    └─────────────────┘
```

---

## Flujo típico de una subasta

```
1. Usuario deposita fondos      → Ledger: DEPOSIT
2. Usuario realiza puja         → Ledger: HOLD
3. Usuario es superado          → Ledger: RELEASE
4. Usuario vuelve a pujar       → Ledger: HOLD
5. Subasta cierra, usuario gana → Ledger: PURCHASE
6. Vendedor recibe pago         → Ledger: CREDIT (vendedor)
```

---

## Regla fundamental

> **No existe ninguna acción económica en IronLoot que no esté respaldada por saldo real del usuario.**

---

## Referencias cruzadas

* [01-producto/08-flujos.md](../01-producto/08-flujos.md) – Flujos funcionales
* [01-producto/09-reglas-negocio.md](../01-producto/09-reglas-negocio.md) – Reglas de negocio
* [02-ingenieria/](../02-ingenieria/) – Implementación técnica

---

## Checklist para desarrollo

Antes de implementar el módulo Wallet, verificar:

- [ ] Modelo de datos de Wallet (available, held, userId)
- [ ] Modelo de datos de Ledger (tipo, monto, referencia, timestamp)
- [ ] Transacciones atómicas para hold/release
- [ ] Validación de saldo antes de cada puja
- [ ] Endpoint de depósito con integración a pasarela
- [ ] Endpoint de retiro con validaciones
- [ ] Endpoint de historial de movimientos
- [ ] Tests unitarios para cada tipo de movimiento
- [ ] Tests E2E para flujo completo de subasta
- [ ] Documentación de API en Swagger

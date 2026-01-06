# 1. Wallet – Sistema de Cuenta del Usuario

El **Wallet de IronLoot** es el sistema central que garantiza que todas las pujas y compras dentro de la plataforma estén respaldadas por dinero real del usuario.

Su objetivo principal es:

* Evitar pujas falsas o especulativas.
* Garantizar que un usuario ganador pueda completar la compra sin fricción.
* Aportar confianza, trazabilidad y seriedad al ecosistema de subastas.
* Diferenciar a IronLoot de plataformas de subastas tradicionales.

El Wallet no es solo un saldo; es un **sistema de control de fondos con reglas claras de reserva, liberación y liquidación**.

Este documento es la **fuente de verdad funcional** del sistema Wallet.

---

## 1.1 Conceptos clave

### Wallet (Cuenta)

Cada usuario de IronLoot tiene **una cuenta interna de dinero** asociada a su perfil.

Esta cuenta:

* Pertenece exclusivamente al usuario.
* Opera dentro de la plataforma (no es una cuenta bancaria).
* Se utiliza para pujar, comprar y recibir devoluciones.

---

### Tipos de saldo

El Wallet se divide conceptualmente en **dos tipos de saldo**:

**Saldo Disponible (Available)**

* Dinero libre que el usuario puede usar para realizar nuevas pujas o comprar artículos.
* Es el único saldo que puede iniciar acciones económicas.

**Saldo Retenido (Held)**

* Dinero reservado temporalmente como respaldo de una puja activa.
* No puede usarse para otras acciones mientras esté retenido.
* Existe para garantizar que una puja es real y ejecutable.

El dinero retenido **sigue siendo del usuario**, pero no está disponible hasta que la puja se libere o se liquide.

---

### Ledger (Registro de Movimientos)

El Ledger es el **historial contable** del Wallet.

Registra cada movimiento de dinero, incluyendo:

* Depósitos.
* Retenciones por pujas.
* Liberaciones de fondos.
* Compras.
* Reembolsos.
* Comisiones o ajustes.

Su función es:

* Dar trazabilidad completa.
* Permitir auditoría.
* Evitar inconsistencias o saldos sin justificación.

---

## 1.2 Activación de la cuenta

### Registro vs Activación

Un usuario puede:

* Registrarse.
* Ver subastas.
* Navegar productos.

Pero **no puede**:

* Pujar.
* Comprar.

Hasta que cumpla la condición de **activación de cuenta**.

---

### Regla de Activación

Para activar su cuenta, el usuario debe realizar un **depósito mínimo inicial** en su Wallet.

Este depósito:

* Habilita la participación activa en la plataforma.
* Demuestra intención real de compra.
* Protege el ecosistema de usuarios especulativos.

El monto mínimo:

* Es configurable por la plataforma.
* Puede variar por región o moneda.
* Se define como regla de negocio global.

---

### Estados del usuario (conceptual)

De forma conceptual, el usuario puede estar en alguno de estos estados respecto al Wallet:

* **Registrado / No activado**
  Puede navegar, pero no puede pujar ni comprar.

* **Activo**
  Tiene Wallet con saldo suficiente y puede usar todas las funciones.

* **Restringido o Suspendido**
  No puede realizar nuevas acciones; su dinero permanece intacto hasta resolución.

---

## 1.3 Regla fundamental del Wallet

> **No existe ninguna acción económica en IronLoot que no esté respaldada por saldo real del usuario.**

Esta regla es la base de la confianza del sistema y aplica de forma absoluta a todas las operaciones.

---

## 1.4 Uso del Wallet en subastas

### Regla de pujas

Cuando un usuario intenta pujar por un monto **X**:

1. El sistema verifica:
   * Que la subasta esté activa.
   * Que el usuario no sea el creador.
   * Que la puja cumpla el mínimo requerido.
   * Que el usuario tenga **saldo disponible ≥ X**.

2. Si **no** tiene saldo suficiente:
   * La puja es rechazada.

3. Si **sí** tiene saldo suficiente:
   * El monto X se retiene en su Wallet.
   * Ese dinero pasa de Disponible a Retenido.
   * Se registra la puja como válida.

**La puja solo existe si el dinero existe.**

---

### Retención de fondos (Hold)

* Cada subasta mantiene **una sola puja activa retenida**: la más alta.
* El dinero retenido corresponde **únicamente al mejor postor actual**.

---

### Cuando un usuario es superado (Outbid)

Si otro usuario realiza una puja mayor:

* El usuario anterior pierde su posición como mejor postor.
* Su dinero retenido se **libera automáticamente**.
* El saldo vuelve a estar disponible.

Esto garantiza que ningún usuario quede bloqueado innecesariamente y que el dinero solo esté retenido cuando es estrictamente necesario.

---

### Cierre de subasta

Al finalizar una subasta:

**Usuario ganador:**

* El dinero retenido se convierte en compra definitiva.
* Sale del Wallet como pago del artículo.

**Usuarios no ganadores:**

* No tienen fondos retenidos.
* No se realiza ninguna acción adicional.

---

### Cancelación de subasta

Si una subasta se cancela:

* Todos los fondos retenidos asociados a esa subasta se liberan automáticamente.
* Regresan al saldo disponible de cada usuario.

---

## 1.5 Uso del Wallet en compras directas

En compras sin subasta:

1. El usuario intenta comprar un artículo por **X**.
2. El sistema valida que el saldo disponible sea ≥ X.
3. Si es válido:
   * El dinero se descuenta directamente.
   * Se registra la compra.
4. Si no es válido:
   * La compra se rechaza.

**No existe compra "pendiente de pago" dentro del modelo Wallet-first.**

---

## 1.6 Depósitos y fondos

### Depósitos

Los usuarios pueden:

* Añadir dinero a su Wallet.
* Incrementar su saldo disponible.

El método de depósito:

* Es externo al Wallet (pasarela de pago).
* El Wallet solo refleja el resultado exitoso.

---

### Reembolsos

Un reembolso:

* Se refleja como un movimiento positivo en el Wallet.
* Nunca se "borra" una transacción anterior.
* Siempre queda registro en el Ledger.

---

## 1.7 Principios del sistema Wallet

El diseño del Wallet se rige por los siguientes principios:

* **Consistencia**
  El saldo siempre debe cuadrar con su historial.

* **Trazabilidad**
  Todo movimiento debe poder explicarse.

* **Atomicidad**
  Las operaciones de dinero son indivisibles: o pasan completas o no pasan.

* **Confianza**
  El usuario sabe que su dinero está controlado y visible.

* **Escalabilidad**
  El sistema permite agregar comisiones, multimoneda, bonos y créditos promocionales.

---

## 1.8 Lo que NO es el Wallet

Para evitar confusiones:

* No es una cuenta bancaria.
* No es un sistema de crédito.
* No permite pujas "a futuro".
* No permite comprar sin saldo real.

---

## 1.9 Rol del Wallet en IronLoot

El Wallet no es un módulo secundario.

Es:

* El **corazón económico** de IronLoot.
* La base de la confianza entre usuarios.
* El elemento que hace que la plataforma sea seria, sostenible y defendible.

A partir de este documento:

* Se definen reglas técnicas.
* Se diseñan APIs.
* Se construyen flujos.
* Se validan casos límite.

---

## 1.10 Relación con otros documentos

Este documento se complementa con:

* **09-reglas-negocio.md** – Reglas generales de la plataforma.
* **08-flujos.md** – Flujos funcionales que involucran el Wallet.
* **02-usuarios-y-roles.md** – Estados del usuario y habilitación.

Para la implementación técnica, ver la documentación en `docs/02-ingenieria/`.

# 3. Depósitos y Retiros

Este documento define los **flujos de entrada y salida de dinero** del Wallet del usuario en IronLoot.

Establece:

* Qué está permitido.
* En qué condiciones.
* Con qué restricciones.

---

## 3.1 Depósitos

### Qué es un depósito

Un depósito es la acción mediante la cual un usuario:

* Introduce dinero a la plataforma.
* Incrementa su saldo disponible.
* Activa o fortalece su capacidad de compra.

---

### Depósito inicial (Activación)

Para activar su cuenta, el usuario debe realizar un **depósito mínimo inicial**.

Este depósito:

* Habilita pujas y compras.
* No está ligado a una subasta específica.
* Forma parte del saldo disponible.

---

### Flujo general de depósito

1. Usuario inicia depósito.
2. Se procesa el pago mediante una pasarela externa.
3. Solo tras confirmación exitosa:
   * Se registra el movimiento en el Ledger.
   * Se incrementa el saldo disponible.

Si el pago falla:

* No se registra ningún movimiento.
* El Wallet no cambia.

---

### Reglas de depósito

* No existen depósitos "pendientes" dentro del Wallet.
* El Wallet solo refleja dinero confirmado.
* Los depósitos no pueden aplicarse parcialmente.

---

## 3.2 Retiros

### Concepto de retiro

Un retiro es la acción mediante la cual:

* El usuario solicita sacar dinero de la plataforma.
* El dinero sale del Wallet hacia un método externo.

---

### Restricciones generales de retiro

Un usuario **NO puede retirar** dinero que:

* Esté retenido (Held).
* Esté asociado a una puja activa.
* Esté involucrado en una orden en proceso.
* Esté bloqueado por revisión o disputa.

Solo el **saldo disponible libre** puede retirarse.

---

### Flujo general de retiro

1. Usuario solicita retiro.
2. Sistema valida:
   * Estado del usuario.
   * Saldo disponible suficiente.
   * Que no existan bloqueos.
3. El monto se descuenta del Wallet.
4. Se registra el movimiento en el Ledger.
5. Se procesa la salida hacia el método externo.

---

### Estados del retiro

Conceptualmente, un retiro puede pasar por:

* Solicitado.
* En proceso.
* Completado.
* Fallido / Revertido.

El Wallet refleja el impacto **cuando el retiro se confirma**.

---

## 3.3 Reembolsos

Los reembolsos:

* Se tratan como depósitos internos.
* Siempre están asociados a una transacción previa.
* Incrementan el saldo disponible.

**Nunca se "revierte" una compra eliminando registros.**

---

## 3.4 Principios clave

* El Wallet nunca refleja dinero inexistente.
* El Ledger siempre explica la historia.
* La plataforma prioriza seguridad sobre velocidad.

---

## 3.5 Qué NO está definido aquí

* Pasarelas específicas.
* Comisiones.
* Tiempos bancarios.
* Reglas fiscales.

Este documento define **el comportamiento funcional**, no la infraestructura.

---

## 3.6 Relación con otros documentos

Este documento se complementa con:

* **01-wallet.md** – Definición del sistema de Wallet.
* **02-ledger-y-movimientos.md** – Registro contable.
* **04-casos-limite.md** – Resolución de conflictos.

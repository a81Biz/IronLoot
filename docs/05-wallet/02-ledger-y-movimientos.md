# 2. Ledger y Movimientos Contables

El **Ledger de IronLoot** es el sistema de registro contable que documenta **cada movimiento de dinero** dentro del Wallet de un usuario.

Su objetivo es:

* Garantizar trazabilidad total.
* Evitar inconsistencias de saldo.
* Permitir auditoría interna y resolución de conflictos.
* Servir como fuente de verdad histórica del dinero del usuario.

El saldo del Wallet **nunca se modifica sin dejar rastro en el Ledger**.

---

## 2.1 Qué es el Ledger

El Ledger es un **registro inmutable de eventos financieros**.

Cada entrada representa:

* Un hecho ocurrido.
* Un cambio en el estado del dinero.
* Un motivo verificable.

El Ledger **no se edita ni se borra**. Si algo debe corregirse, se registra un nuevo movimiento compensatorio.

---

## 2.2 Principios contables del Ledger

**Inmutabilidad**

* Las entradas no se modifican.
* No existen "updates" de movimientos pasados.

**Auditabilidad**

* Cada entrada debe poder explicarse sin contexto externo.

**Atomicidad**

* Un evento financiero genera todas sus entradas o ninguna.

**Neutralidad**

* El Ledger no decide reglas.
* Solo registra lo que ya fue validado por el sistema.

---

## 2.3 Tipos de movimientos

### Depósito

* Incrementa saldo disponible.
* Origen: pasarela de pago, ajuste manual, promoción.
* No afecta saldo retenido.

### Retención (Hold)

* Mueve dinero de **Disponible → Retenido**.
* Siempre asociado a una puja y una subasta.
* No reduce el dinero total del usuario.

### Liberación (Release)

* Mueve dinero de **Retenido → Disponible**.
* Se produce cuando:
  * El usuario es superado en una subasta.
  * Se cancela una subasta.
  * Ocurre un fallo que invalida la puja.

### Compra / Débito

* Reduce dinero retenido o disponible.
* Representa una transacción final.
* Es irreversible (salvo reembolso).

### Reembolso

* Incrementa saldo disponible.
* Siempre referencia una compra previa.
* Nunca elimina el movimiento original.

### Ajuste / Corrección

* Se utiliza solo en casos administrativos.
* Siempre documentado.
* Nunca silencioso.

---

## 2.4 Relación del Ledger con otras entidades

Cada movimiento del Ledger debe poder vincularse a:

* Usuario.
* Wallet.
* Evento origen:
  * Subasta.
  * Puja.
  * Orden.
  * Pago.
  * Reembolso.

Esto permite reconstruir:

* El estado del Wallet en cualquier punto del tiempo.
* El motivo de cualquier saldo actual.

---

## 2.5 Reconstrucción de saldo

El saldo del Wallet:

* Puede calcularse a partir del Ledger.
* Debe coincidir siempre con el estado actual.

Si existe discrepancia:

* El Ledger es la fuente de verdad.
* El saldo visible debe corregirse.

---

## 2.6 Qué NO hace el Ledger

* No valida reglas de negocio.
* No decide si una acción es válida.
* No previene errores por sí mismo.
* No "arregla" inconsistencias mágicamente.

El Ledger **registra consecuencias**, no decisiones.

---

## 2.7 Rol del Ledger en IronLoot

El Ledger:

* Protege a los usuarios.
* Protege a la plataforma.
* Permite escalar el sistema financiero sin perder control.

Sin Ledger:

* No hay confianza.
* No hay auditoría.
* No hay plataforma seria.

Este documento define **cómo se registra el dinero**, no cómo se mueve.

---

## 2.8 Relación con otros documentos

Este documento se complementa con:

* **01-wallet.md** – Definición del sistema de Wallet.
* **03-depositos-y-retiros.md** – Flujos de entrada y salida.
* **04-casos-limite.md** – Resolución de conflictos.

# 4. Casos Límite y Resolución de Conflictos

Este documento describe **situaciones excepcionales** que pueden ocurrir en el uso del Wallet y cómo deben resolverse desde el punto de vista de negocio.

Su objetivo es:

* Evitar ambigüedades.
* Reducir decisiones improvisadas.
* Proteger al usuario y a la plataforma.

---

## 4.1 Usuario con puja activa intenta retirar fondos

**Caso**

El usuario tiene dinero retenido por una puja activa y solicita un retiro.

**Resolución**

* El retiro se rechaza.
* Solo el saldo disponible libre es retirable.
* El usuario debe esperar a ser superado o a que la subasta finalice.

---

## 4.2 Subasta cancelada con puja activa

**Caso**

Una subasta se cancela mientras existe una puja válida.

**Resolución**

* Todo dinero retenido se libera.
* El saldo vuelve a estar disponible.
* Se registra el evento en el Ledger.

---

## 4.3 Usuario gana subasta pero su cuenta es suspendida

**Caso**

El usuario gana una subasta y luego es suspendido.

**Resolución**

* El dinero retenido no se pierde.
* La compra no se ejecuta automáticamente.
* El caso se deriva a revisión administrativa.
* El Ledger conserva todos los movimientos.

---

## 4.4 Fallo del sistema durante una puja

**Caso**

Ocurre un error técnico durante el proceso de puja.

**Resolución**

* La operación debe ser atómica:
  * O se crea la puja y el hold.
  * O no ocurre nada.
* No pueden existir:
  * Holds sin puja.
  * Pujas sin hold.

---

## 4.5 Usuario intenta pujar en múltiples subastas con el mismo saldo

**Caso**

El usuario intenta usar el mismo dinero para varias pujas.

**Resolución**

* Cada puja requiere su propio respaldo.
* Si el saldo disponible no alcanza, la nueva puja se rechaza.

---

## 4.6 Reembolso posterior a compra

**Caso**

Una compra requiere reembolso parcial o total.

**Resolución**

* Se registra un nuevo movimiento positivo.
* El saldo disponible se incrementa.
* No se elimina la compra original.

---

## 4.7 Inconsistencia entre saldo y Ledger

**Caso**

El saldo visible no coincide con el Ledger.

**Resolución**

* El Ledger es la fuente de verdad.
* El saldo se corrige.
* El incidente se registra.

---

## 4.8 Usuario elimina su cuenta con dinero disponible

**Caso**

El usuario solicita eliminación de cuenta con saldo.

**Resolución**

* No se elimina la cuenta inmediatamente.
* Se requiere:
  * Retiro de fondos.
  * O resolución administrativa.
* El dinero nunca se pierde.

---

## 4.9 Doble puja simultánea (race condition)

**Caso**

Dos usuarios envían pujas al mismo tiempo por el mismo monto o similar.

**Resolución**

* Solo una puja puede ser la ganadora.
* La puja que se procesa primero (orden de llegada al servidor) gana.
* La segunda puja debe:
  * Rechazarse si el monto ya no es válido.
  * O procesarse si supera la puja anterior.
* El sistema debe garantizar serialización de pujas por subasta.

---

## 4.10 Usuario con saldo justo para una puja pierde conexión

**Caso**

El usuario realiza una puja exitosa pero pierde conexión antes de recibir confirmación.

**Resolución**

* Si la puja se registró en el servidor:
  * El hold existe y la puja es válida.
  * El usuario verá el estado actualizado al reconectarse.
* Si la puja no llegó al servidor:
  * No existe puja ni hold.
  * El saldo permanece disponible.

---

## 4.11 Principio final

Ante cualquier caso no previsto, se prioriza:

1. Integridad del dinero.
2. Trazabilidad.
3. Protección del usuario.
4. Protección del sistema.

Este documento evita decisiones arbitrarias.

---

## 4.12 Relación con otros documentos

Este documento se complementa con:

* **01-wallet.md** – Definición del sistema de Wallet.
* **02-ledger-y-movimientos.md** – Registro contable.
* **03-depositos-y-retiros.md** – Flujos de entrada y salida.
* **01-producto/09-reglas-negocio.md** – Reglas generales de la plataforma.

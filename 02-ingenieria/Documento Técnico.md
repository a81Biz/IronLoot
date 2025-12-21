# Documento Técnico – Plataforma Iron Loot

## 1. Propósito del Documento

Este documento describe la **arquitectura técnica**, los **módulos del sistema**, los **contratos internos**, los **flujos técnicos**, y los **criterios transversales** necesarios para implementar Iron Loot conforme a:

* las reglas de negocio definidas,
* los casos de uso aprobados,
* y las bases técnicas establecidas.

Este documento **no redefine funcionalidad**.
Traduce el diseño funcional a una **estructura técnica ejecutable**.

---

## 2. Visión General de la Arquitectura

### 2.1 Tipo de arquitectura

**Monolito modular con NestJS**

El sistema se implementa como una única aplicación backend organizada en **módulos funcionales independientes**, con separación estricta de responsabilidades.

Cada módulo contiene:

* Controladores (entrada HTTP)
* Servicios (casos de uso / reglas de negocio)
* Entidades de dominio
* Repositorios (persistencia)
* Eventos y validaciones propias

No existe comunicación directa entre controladores de distintos módulos; la interacción se da a través de servicios bien definidos.

---

## 3. Capas del Sistema

### 3.1 Capa de Presentación (API)

Responsable de:

* exponer endpoints HTTP,
* validar entrada superficial (DTO),
* autenticar y autorizar solicitudes,
* delegar al servicio correspondiente.

**No contiene lógica de negocio.**

---

### 3.2 Capa de Aplicación (Servicios / Casos de Uso)

Responsable de:

* implementar reglas de negocio,
* coordinar entidades,
* ejecutar validaciones de dominio,
* emitir eventos de negocio.

Aquí viven los **casos de uso reales** del sistema.

---

### 3.3 Capa de Dominio

Contiene:

* Entidades (Auction, Bid, Order, User, etc.)
* Estados válidos
* Reglas invariantes

El dominio **no conoce HTTP, DB ni frameworks**.

---

### 3.4 Capa de Infraestructura

Incluye:

* Repositorios concretos (PostgreSQL)
* Integraciones externas (pagos, notificaciones)
* Logging y persistencia de eventos

---

## 4. Módulos del Sistema

### 4.1 Auth Module

**Responsabilidad:** autenticación y sesiones.

* Registro de usuario
* Login
* Recuperación de acceso
* Generación y validación de tokens/sesiones

No maneja verificación ni roles de negocio.

---

### 4.2 Users Module

**Responsabilidad:** identidad y estado del usuario.

* Perfil del usuario
* Estado (activo, suspendido)
* Nivel de verificación
* Activación de rol vendedor

---

### 4.3 Auctions Module

**Responsabilidad:** gestión de subastas.

* Creación y publicación
* Estados de subasta
* Control de tiempos
* Cierre automático

Este módulo **no gestiona pujas directamente**.

---

### 4.4 Bids Module

**Responsabilidad:** pujas y reglas de competencia.

* Validación de pujas
* Incrementos mínimos
* Soft-close
* Historial visible

Este módulo es **crítico en concurrencia**.

---

### 4.5 Orders Module

**Responsabilidad:** transacciones derivadas de subastas.

* Generación de orden al cierre
* Estados de la transacción
* Relación comprador–vendedor

---

### 4.6 Payments Module

**Responsabilidad:** gestión de pagos.

* Inicio de pago
* Confirmación
* Expiración por plazo
* Cambios de estado de orden

---

### 4.7 Shipments Module

**Responsabilidad:** entrega del artículo.

* Registro de envío
* Confirmación de recepción
* Actualización de estados

---

### 4.8 Ratings Module

**Responsabilidad:** reputación y confianza.

* Calificaciones bidireccionales
* Cálculo de reputación
* Restricciones por transacción

---

### 4.9 Disputes Module

**Responsabilidad:** resolución de conflictos.

* Apertura de disputa
* Negociación
* Escalamiento
* Resolución y sanciones

---

### 4.10 Notifications Module

**Responsabilidad:** comunicación de eventos.

* Notificaciones internas
* Alertas por estado
* Mensajes derivados de eventos de negocio

---

## 5. Flujo Técnico Clave (resumen)

### 5.1 Flujo de Puja

1. API recibe solicitud
2. Guard valida autenticación/verificación
3. Servicio valida reglas de puja
4. Transacción DB:

   * inserta bid
   * actualiza precio
   * extiende cierre si aplica
5. Evento emitido: `BID_PLACED`
6. Notificaciones generadas

---

### 5.2 Flujo de Cierre de Subasta

1. Job programado detecta expiración
2. Se bloquea la subasta
3. Se determina ganador
4. Se crea orden
5. Evento emitido: `AUCTION_CLOSED`

---

## 6. Control de Errores

### 6.1 Estrategia

* Errores de negocio → clases explícitas
* Errores técnicos → capturados globalmente
* Todos los errores:

  * tienen código
  * tienen contexto
  * se registran con traceId

Ejemplos:

* `BID_TOO_LOW`
* `AUCTION_CLOSED`
* `USER_NOT_VERIFIED`
* `PAYMENT_EXPIRED`

---

## 7. Trazabilidad y Observabilidad

### 7.1 Trace por request

* Cada request genera un `traceId`
* El trace se propaga por:

  * logs
  * eventos
  * errores

---

### 7.2 Eventos de negocio

Todos los eventos críticos se registran como:

* entidad
* acción
* actor
* timestamp
* estado resultante

Ejemplo:

* `Auction / Closed / system / success`

---

## 8. Seguridad Técnica

### 8.1 Autorización

Implementada mediante:

* Guards (rol, verificación, vendedor)
* Validación adicional en servicios

Nunca se confía solo en el frontend.

---

### 8.2 Protección de concurrencia

* Transacciones explícitas
* Locks o control optimista
* Idempotencia en jobs

Especial cuidado en:

* pujas
* cierres
* pagos

---

## 9. Convenciones Técnicas

* Un módulo no accede directamente a la DB de otro.
* Los controladores no contienen lógica.
* Ningún evento se pierde silenciosamente.
* Toda acción relevante deja rastro.

---

## 10. Relación con QA y Desarrollo

Este documento permite:

* crear tests por caso de uso,
* definir pruebas de concurrencia,
* validar reglas de negocio sin UI.

El código debe ser una **implementación directa** de este documento, no una reinterpretación.

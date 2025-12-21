## 1. Propósito

Este documento define la **política de observabilidad** de Iron Loot y las reglas por ambiente para:

* **Logging estructurado** (técnico)
* **Trazabilidad (traceId)** por request y por flujo
* **Registro de errores** (captura centralizada)
* **Registro de eventos de negocio** (auditoría)

La meta es que **desde el primer día de desarrollo**:

* podamos reconstruir cualquier incidente,
* sepamos qué actor ejecutó qué acción,
* sepamos sobre qué entidad ocurrió,
* y podamos correlacionar UI/API/DB con un identificador único.

Este documento **no** enumera todos los errores/eventos posibles (eso crecerá con el producto).
Define el **marco y las reglas** para registrarlos de forma consistente.

---

## 2. Principios (no negociables)

### P1. Nada crítico se pierde en consola

* La consola se considera **un medio auxiliar**.
* La información crítica debe persistir:

  * en base de datos (eventos/errores),
  * o en un sistema de logs centralizado (en fases posteriores).

### P2. Toda solicitud tiene correlación

* Cada request que entra al backend debe tener un **traceId**.
* Si el cliente no lo envía, el backend lo genera.
* El traceId se propaga a:

  * logs técnicos,
  * errores,
  * eventos de negocio,
  * respuestas de API.

### P3. Los errores de negocio no son “excepciones genéricas”

* Un error de negocio representa un estado esperado (ej. “puja demasiado baja”).
* Debe ser:

  * detectable,
  * registrable,
  * traducible a UI,
  * y accionable por el usuario.

### P4. Eventos de negocio ≠ logs técnicos

* **Evento de negocio (auditoría):** “pasó algo relevante en el dominio”

  * Ej: “BidPlaced”, “AuctionClosed”, “PaymentConfirmed”
* **Log técnico:** “información de operación del sistema”

  * Ej: latencia, endpoint, payload validado, debug de componentes

### P5. Control de PII (datos sensibles)

* Nunca se registran en texto plano:

  * contraseñas,
  * tokens,
  * datos bancarios,
  * identificaciones,
  * direcciones completas (según necesidad, se reduce/anonimiza),
  * información que no sea estrictamente necesaria.
* Los registros usan **whitelisting** de campos permitidos, no blacklisting.

---

## 3. Ambientes oficiales

Iron Loot tendrá los siguientes ambientes:

### 3.1 Local / Dev (`local`)

* Entorno de desarrollo en máquina del equipo.
* Permite logs detallados para depuración.
* Puede tener datos sintéticos o semirreales.

### 3.2 QA / Staging (`qa`)

* Entorno para pruebas de integración y QA.
* Simula producción en configuración, pero sin datos reales sensibles.
* Logs suficientes para reproducir bugs.

### 3.3 Producción (`prod`)

* Entorno real con usuarios reales.
* Máxima restricción de logs con datos sensibles.
* Máxima consistencia y auditoría.

---

## 4. Niveles de log por ambiente

### 4.1 Definición de niveles

* `DEBUG`: detalle interno (solo dev)
* `INFO`: eventos operativos normales (siempre)
* `WARN`: condiciones anómalas no fatales
* `ERROR`: fallos o rechazos relevantes

### 4.2 Política por ambiente

**local**

* Log mínimo permitido: `DEBUG`
* Log recomendado: `DEBUG` + `INFO`
* Stacktraces completos: **sí**
* Payloads: permitidos **solo con whitelisting**

**qa**

* Log mínimo permitido: `INFO`
* Stacktraces completos: parcial (sin datos sensibles)
* Payloads: estrictos, solo whitelisting

**prod**

* Log mínimo permitido: `INFO`
* `DEBUG` deshabilitado
* Stacktraces: recortados (sin internals innecesarios)
* Payloads: solo campos mínimos y siempre whitelisted

---

## 5. Qué se registra y dónde

### 5.1 Categorías de registro

Iron Loot registra tres grandes tipos de información:

1. **Request logs (técnico)**

   * entrada/salida de requests
   * tiempos de respuesta
   * userId (si existe)
   * endpoint y método
   * status code
   * traceId

2. **Error logs (técnico + negocio)**

   * errores inesperados (exceptions)
   * errores esperados (negocio)
   * contexto mínimo reproducible
   * traceId obligatorio

3. **Eventos de negocio (auditoría)**

   * acciones relevantes del dominio
   * actor, entidad, estado resultante
   * sin datos sensibles
   * traceId obligatorio

### 5.2 Destino por ambiente

**local**

* Request logs: consola + persistencia opcional en DB
* Error logs: consola + DB (recomendado)
* Eventos de negocio: DB (obligatorio para validar auditoría)

**qa**

* Request logs: DB (o centralizado si existe)
* Error logs: DB (obligatorio)
* Eventos de negocio: DB (obligatorio)

**prod**

* Request logs: centralizado + muestreo o DB mínima (según performance)
* Error logs: DB + centralizado (obligatorio)
* Eventos de negocio: DB (obligatorio, no muestreado)

> Nota: Para Iron Loot, los **eventos de negocio** deben ser persistentes en todos los ambientes relevantes, porque son la base de auditoría y confianza.

---

## 6. Reglas de trazabilidad (traceId)

### 6.1 Generación

* Si el request trae `X-Trace-Id`, se usa.
* Si no, el backend genera uno.

### 6.2 Propagación

El `traceId` debe:

* agregarse a todos los logs del request,
* insertarse en registros de error/evento,
* devolverse en la respuesta HTTP en header `X-Trace-Id`.

### 6.3 Correlación por flujo

En flujos largos (subasta → pago → envío), además del traceId:

* se debe registrar el `entityId` (auctionId/orderId)
  para reconstruir la historia aunque cambie el traceId entre requests.

---

## 7. Definición formal de “Evento de negocio”

Un evento de negocio se registra cuando:

* cambia el estado de una entidad central (Auction, Order, Dispute, etc.)
* se ejecuta una acción con valor audit-able:

  * puja
  * cierre
  * pago confirmado
  * envío registrado
  * recepción confirmada
  * disputa abierta/resuelta
  * sanción aplicada

### 7.1 Campos mínimos (conceptuales)

Todo evento de negocio debe registrar al menos:

* `event_type` (ej. `BID_PLACED`)
* `actor_user_id` (usuario o “system”)
* `entity_type` (Auction, Order, Dispute…)
* `entity_id`
* `timestamp`
* `trace_id`
* `payload` (solo whitelist, mínimo necesario)
* `result` (success/fail + razón si aplica)

---

## 8. Definición formal de “Error registrable”

Un error se registra siempre que:

* cause un status code >= 400 **relevante**
* represente un rechazo por regla de negocio
* sea una excepción no controlada

### 8.1 Campos mínimos (conceptuales)

* `error_code` (o “UNHANDLED_EXCEPTION”)
* `message` (controlado, sin secretos)
* `http_status`
* `actor_user_id` (si existe)
* `trace_id`
* `context` (endpoint, entityId si aplica)
* `stack` (solo en local/qa; en prod recortado)

---

## 9. Reglas anti-hardcode (para consistencia)

Para evitar que el sistema termine con mensajes y registros “a mano”:

* La estructura de logs/eventos/errores se define en un solo lugar (módulo transversal).
* Los módulos funcionales **no construyen logs manuales** salvo casos excepcionales.
* Los servicios emiten:

  * “resultado” + “error code” + “contexto”
    y la capa transversal se encarga de:
  * persistir en DB,
  * imprimir en consola según ambiente,
  * anexar traceId.

---

## 10. Alcance inicial recomendado (para arrancar el desarrollo)

Para el primer sprint técnico, Iron Loot debe arrancar con:

1. Middleware de `traceId` (generar/propagar)
2. Interceptor de request logging (mínimo)
3. Filtro global de excepciones (captura + error envelope)
4. Registro de **eventos de negocio** en endpoints críticos:

   * `placeBid`
   * `closeAuction`
   * `confirmPayment`
   * `setShipment`
   * `confirmReceived`
   * `openDispute`
   * `resolveDispute`

Esto permite validar el pipeline completo:

* request → servicio → error/evento → DB

---

## 11. Dependencias con otros documentos

Este documento debe mantenerse alineado con:

* **Bases Técnicas.md** (tecnología y arquitectura)
* **Documento Técnico.md** (módulos y flujos)
* Próximos documentos:

  * `02-logging-y-trazabilidad.md`
  * `03-modelo-registro-db.md`
  * `04-estructura-errores-y-respuestas.md`

---

## 12. Resultado esperado

Cuando esta política se implemente:

* cualquier error tendrá traceId y contexto,
* cualquier evento crítico quedará registrado en DB,
* se podrá auditar una subasta de punta a punta,
* el equipo podrá depurar sin “adivinar”.

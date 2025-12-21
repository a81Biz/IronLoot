# Formato estándar de Caso de Uso (Iron Loot)

**Estructura usada (misma para todos):**

* ID
* Nombre
* Actor(es)
* Descripción
* Precondiciones
* Disparador
* Flujo principal
* Flujos alternativos / Excepciones
* Postcondiciones

---

## UC-01 – Explorar Home Pública

**Actor:** Visitante
**Descripción:** Permite al visitante entender qué es Iron Loot y visualizar subastas destacadas.
**Precondiciones:** Ninguna
**Disparador:** El visitante accede a la URL principal.

**Flujo principal:**

1. El sistema muestra la home pública.
2. Se presentan subastas destacadas y próximas a cerrar.
3. Se muestran CTAs para explorar, registrarse o iniciar sesión.

**Flujos alternativos:**

* A1: Si no hay subastas destacadas, el sistema muestra mensaje informativo y acceso al escaparate.

**Postcondiciones:** Ninguna.

---

## UC-02 – Explorar Escaparate de Subastas

**Actor:** Visitante / Usuario
**Descripción:** Visualizar el listado completo de subastas activas.
**Precondiciones:** Existir subastas publicadas.
**Disparador:** Acceso al escaparate desde la home o menú.

**Flujo principal:**

1. El sistema lista subastas activas.
2. Cada tarjeta muestra precio, tiempo restante, número de pujas y reputación del vendedor.
3. El actor selecciona una subasta.

**Postcondiciones:** Ninguna.

---

## UC-03 – Buscar y Filtrar Subastas

**Actor:** Visitante / Usuario
**Descripción:** Localizar subastas mediante búsqueda y filtros.
**Precondiciones:** Existir subastas activas.
**Disparador:** Ingreso de texto o selección de filtros.

**Flujo principal:**

1. El actor ingresa criterios de búsqueda o filtros.
2. El sistema actualiza el listado de resultados.
3. El actor selecciona una subasta.

**Postcondiciones:** Ninguna.

---

## UC-04 – Ver Detalle Público de Subasta

**Actor:** Visitante / Usuario
**Descripción:** Consultar información completa de una subasta.
**Precondiciones:** La subasta existe.
**Disparador:** Selección de una subasta desde el listado.

**Flujo principal:**

1. El sistema muestra imágenes, descripción, precio actual, tiempo restante e historial visible.
2. Se muestra información del vendedor (reputación/verificación).
3. Si el actor no puede pujar, el sistema muestra CTA para autenticarse o verificarse.

**Postcondiciones:** Ninguna.

---

## UC-05 – Registrar Usuario

**Actor:** Visitante
**Descripción:** Crear una cuenta única en Iron Loot.
**Precondiciones:** El usuario no está registrado.
**Disparador:** Selección de “Registrarse”.

**Flujo principal:**

1. El visitante completa el formulario de registro.
2. El sistema valida la información.
3. El sistema crea la cuenta.
4. El usuario accede al dashboard inicial.

**Excepciones:**

* E1: Email ya registrado → se sugiere iniciar sesión.

**Postcondiciones:** Usuario registrado.

---

## UC-06 – Iniciar Sesión

**Actor:** Usuario registrado
**Descripción:** Acceder a la zona privada.
**Precondiciones:** Usuario registrado.
**Disparador:** Ingreso de credenciales.

**Flujo principal:**

1. El usuario ingresa credenciales.
2. El sistema valida.
3. El sistema redirige al dashboard.

**Excepciones:**

* E1: Credenciales inválidas → mensaje de error.

**Postcondiciones:** Usuario autenticado.

---

## UC-07 – Recuperar Acceso

**Actor:** Usuario
**Descripción:** Recuperar acceso a la cuenta.
**Precondiciones:** Cuenta existente.
**Disparador:** Selección de “Recuperar acceso”.

**Flujo principal:**

1. El usuario inicia el proceso.
2. El sistema guía la recuperación.
3. El usuario restablece acceso.

**Postcondiciones:** Acceso recuperado.

---

## UC-08 – Ver Dashboard del Usuario (Cliente)

**Actor:** Usuario autenticado
**Descripción:** Ver resumen de actividad y alertas.
**Precondiciones:** Usuario autenticado.
**Disparador:** Acceso a la zona privada.

**Flujo principal:**

1. El sistema muestra subastas activas, alertas y acciones pendientes.

**Postcondiciones:** Ninguna.

---

## UC-09 – Gestionar Perfil de Usuario

**Actor:** Usuario autenticado
**Descripción:** Consultar y editar datos de perfil.
**Precondiciones:** Usuario autenticado.
**Disparador:** Acceso a la sección de perfil.

**Flujo principal:**

1. El usuario visualiza su información.
2. El usuario actualiza datos permitidos.
3. El sistema guarda los cambios.

**Postcondiciones:** Perfil actualizado.

---

## UC-10 – Gestionar Verificación de Usuario

**Actor:** Usuario autenticado
**Descripción:** Completar el proceso de verificación.
**Precondiciones:** Usuario registrado.
**Disparador:** Intento de acción restringida o acceso directo.

**Flujo principal:**

1. El sistema muestra requisitos de verificación.
2. El usuario completa la información.
3. El sistema valida y actualiza estado.

**Postcondiciones:** Usuario verificado.

---

## UC-11 – Ver Notificaciones y Alertas

**Actor:** Usuario autenticado
**Descripción:** Consultar alertas relevantes.
**Precondiciones:** Usuario autenticado.
**Disparador:** Acceso a notificaciones.

**Flujo principal:**

1. El sistema muestra alertas de pujas, cierres, pagos y entregas.

**Postcondiciones:** Ninguna.

---

## UC-12 – Gestionar Lista de Seguimiento

**Actor:** Usuario autenticado
**Descripción:** Seguir subastas para monitoreo.
**Precondiciones:** Usuario autenticado.
**Disparador:** Acción “Seguir subasta”.

**Flujo principal:**

1. El usuario marca una subasta.
2. El sistema la agrega a su lista de seguimiento.

**Postcondiciones:** Subasta seguida.

---

## UC-13 – Realizar Puja

**Actor:** Usuario verificado
**Descripción:** Ofertar en una subasta activa.
**Precondiciones:** Usuario verificado y subasta activa.
**Disparador:** Ingreso de monto de puja.

**Flujo principal:**

1. El usuario ingresa el monto.
2. El sistema valida reglas.
3. El sistema registra la puja y actualiza el precio.
4. El sistema notifica a los participantes.

**Excepciones:**

* E1: Usuario no verificado.
* E2: Monto inválido.
* E3: Subasta cerrada.

**Postcondiciones:** Puja registrada.

---

## UC-14 – Ver Subastas Ganadas

**Actor:** Comprador
**Descripción:** Consultar subastas adjudicadas.
**Precondiciones:** Existir subastas ganadas.
**Disparador:** Acceso a “Subastas ganadas”.

**Flujo principal:**

1. El sistema lista subastas ganadas con su estado.

**Postcondiciones:** Ninguna.

---

## UC-15 – Pagar Subasta Ganada

**Actor:** Comprador
**Descripción:** Completar el pago.
**Precondiciones:** Subasta ganada y pago pendiente.
**Disparador:** Selección de “Pagar”.

**Flujo principal:**

1. El comprador confirma el pago.
2. El sistema registra el pago.
3. El vendedor es notificado.

**Postcondiciones:** Pago confirmado.

---

## UC-16 – Gestionar Envío del Artículo

**Actor:** Vendedor
**Descripción:** Gestionar la entrega del artículo vendido.
**Precondiciones:** Pago confirmado.
**Disparador:** Acceso a venta pendiente.

**Flujo principal:**

1. El vendedor registra información de entrega.
2. El sistema notifica al comprador.

**Postcondiciones:** Artículo en entrega.

---

## UC-17 – Confirmar Recepción del Artículo

**Actor:** Comprador
**Descripción:** Confirmar recepción del artículo.
**Precondiciones:** Artículo enviado.
**Disparador:** Confirmación del comprador.

**Flujo principal:**

1. El comprador confirma recepción.
2. El sistema marca la transacción como entregada.

**Postcondiciones:** Transacción completada.

---

## UC-18 – Calificar Contraparte

**Actor:** Comprador / Vendedor
**Descripción:** Emitir calificación posterior a la transacción.
**Precondiciones:** Transacción completada.
**Disparador:** Acceso a transacción finalizada.

**Flujo principal:**

1. El actor emite calificación y comentario.
2. El sistema actualiza la reputación.

**Postcondiciones:** Reputación actualizada.

---

## UC-19 – Iniciar Disputa

**Actor:** Comprador / Vendedor
**Descripción:** Reportar un problema.
**Precondiciones:** Transacción existente.
**Disparador:** Selección de “Iniciar disputa”.

**Flujo principal:**

1. El actor describe el problema.
2. El sistema abre la disputa.

**Postcondiciones:** Disputa abierta.

---

## UC-20 – Resolver Disputa

**Actor:** Mediador / Sistema
**Descripción:** Resolver una disputa según reglas.
**Precondiciones:** Disputa abierta.
**Disparador:** Escalamiento o revisión.

**Flujo principal:**

1. Se evalúa la evidencia.
2. Se aplica resolución.
3. Se cierra la disputa.

**Postcondiciones:** Disputa cerrada.

---

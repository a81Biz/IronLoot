# 8. Flujos Funcionales Principales

Esta sección describe los **flujos funcionales críticos** de Iron Loot, es decir, las secuencias de acciones que permiten a los usuarios interactuar con la plataforma desde el inicio hasta la finalización de una transacción.
Los flujos se describen desde la perspectiva del usuario y del producto, sin detallar implementación técnica.

El objetivo es asegurar que cada proceso sea **claro, coherente y predecible**, reforzando la confianza en la plataforma.

---

## 8.1 Flujo de registro y verificación

1. El visitante inicia el proceso de registro desde la entrada pública o al intentar realizar una acción restringida.
2. El usuario completa el registro y obtiene acceso a su zona privada básica.
3. El sistema informa claramente el estado inicial del usuario y las acciones disponibles.
4. Si el usuario desea realizar acciones transaccionales (pujar o vender), se le solicita completar los procesos de verificación requeridos.
5. Una vez completadas las verificaciones, el usuario accede a funcionalidades ampliadas según su rol.

Este flujo debe comunicar en todo momento **qué falta, por qué es necesario y qué se desbloquea** al avanzar.

---

## 8.2 Flujo de creación de subasta

1. El usuario habilitado como vendedor accede a la opción de crear una nueva subasta desde su dashboard.
2. El sistema guía al vendedor para introducir la información del artículo:

   * Título
   * Descripción
   * Estado del producto
   * Imágenes
3. El vendedor define los parámetros básicos de la subasta:

   * Precio inicial
   * Duración
   * Opciones adicionales permitidas por la plataforma
4. El sistema presenta un resumen completo de la subasta antes de su publicación.
5. El vendedor confirma y publica la subasta, quedando sujeta a las reglas de Iron Loot.

---

## 8.3 Flujo de puja

1. Un usuario verificado accede a la página de detalle de una subasta activa.
2. El sistema muestra información clave:

   * Precio actual
   * Tiempo restante
   * Historial visible de pujas
3. El usuario introduce una puja conforme a las reglas establecidas.
4. El sistema valida la puja y actualiza el estado de la subasta.
5. Todos los usuarios observando la subasta reciben la actualización correspondiente.
6. Si la puja ocurre dentro del período definido como crítico, el tiempo de la subasta se ajusta según las reglas vigentes.

El flujo de puja debe ser **transparente, inmediato y comprensible**, evitando cualquier percepción de manipulación.

---

## 8.4 Flujo de cierre de subasta

1. Al finalizar el tiempo de la subasta, el sistema determina automáticamente el resultado.
2. Si existe un ganador válido, se notifica tanto al comprador como al vendedor.
3. La subasta cambia de estado a “cerrada”.
4. Se habilitan los pasos siguientes para completar la transacción.

Este flujo marca la transición entre la fase competitiva y la fase transaccional.

---

## 8.5 Flujo de pago

1. El comprador ganador accede a la sección de pagos desde su dashboard.
2. El sistema indica el monto a pagar y el plazo disponible.
3. El comprador completa el pago dentro del período establecido.
4. El sistema confirma el pago y notifica al vendedor.
5. La transacción avanza al estado de entrega.

El flujo de pago debe ser **claro, con plazos visibles y consecuencias explícitas** en caso de incumplimiento.

---

## 8.6 Flujo de entrega

1. El vendedor recibe la confirmación de pago.
2. El vendedor gestiona la entrega del artículo según lo acordado.
3. El vendedor proporciona la información correspondiente al envío o entrega.
4. El comprador confirma la recepción del artículo o el sistema avanza automáticamente tras el plazo definido.

Este flujo cierra la parte logística de la transacción y habilita la etapa de calificación.

---

## 8.7 Flujo de calificación

1. Una vez completada la entrega, ambas partes reciben la invitación para calificar la transacción.
2. El comprador califica al vendedor.
3. El vendedor califica al comprador.
4. Las calificaciones se integran a la reputación de cada usuario.

Este flujo refuerza la **autorregulación de la comunidad** y la acumulación de confianza.

---

## 8.8 Flujo de disputa y soporte

1. Si ocurre un problema, el usuario afectado puede iniciar una disputa desde su dashboard.
2. El sistema abre una etapa de comunicación directa entre las partes.
3. Si no se alcanza una solución, la disputa puede escalar a mediación.
4. Se emite una resolución conforme a las reglas de la plataforma.
5. El sistema ejecuta la resolución correspondiente.

El flujo de disputas debe ofrecer una **ruta clara, justa y estructurada**, evitando la arbitrariedad.

# 2. Modelo de Usuarios y Roles

## 2.1 Usuario único y perfil híbrido (comprador / vendedor)

Iron Loot opera bajo un **modelo de usuario único**, en el cual cada persona dispone de **una sola cuenta y un solo perfil** dentro de la plataforma.

No existen cuentas separadas para compradores y vendedores. Un mismo usuario puede:

* Explorar subastas como visitante o usuario registrado.
* Participar como comprador en subastas.
* Crear y gestionar subastas como vendedor.

La capacidad de actuar como vendedor no implica la creación de un nuevo perfil, sino la **activación de permisos adicionales** dentro del mismo perfil de usuario.

Este enfoque garantiza:

* Un historial unificado de actividad.
* Una reputación consistente asociada a una identidad única.
* Mayor control y prevención de fraude.
* Una experiencia más simple y coherente para el usuario.

---

## 2.2 Estados del usuario

El comportamiento y las acciones disponibles para un usuario en Iron Loot dependen de su **estado dentro del sistema**, el cual puede evolucionar con el tiempo.

Los estados principales son:

1. **Visitante**
   Usuario no registrado que puede:

   * Acceder a la zona pública.
   * Explorar el escaparate de subastas.
   * Ver detalles de los artículos.
     No puede pujar, vender ni interactuar de forma transaccional.

2. **Usuario registrado**
   Usuario con cuenta creada que puede:

   * Iniciar sesión.
   * Acceder a su dashboard personal.
   * Seguir subastas y recibir notificaciones básicas.
     Su capacidad para pujar o vender puede estar limitada según su nivel de verificación.

3. **Usuario verificado**
   Usuario que ha completado los procesos de validación requeridos por la plataforma.
   Puede:

   * Participar plenamente como comprador.
   * Acceder a funcionalidades ampliadas.
   * Generar y acumular reputación.

4. **Usuario habilitado para vender**
   Usuario que ha cumplido los requisitos específicos para crear subastas.
   Puede:

   * Publicar y gestionar subastas.
   * Recibir pagos por ventas.
   * Construir reputación como vendedor.

Los estados no son excluyentes entre sí; un usuario puede ser simultáneamente **comprador verificado y vendedor habilitado**.

---

## 2.3 Tipos de uso (perfiles funcionales)

Aunque el sistema maneja un solo tipo de usuario, Iron Loot reconoce distintos **tipos de uso** que influyen en el diseño de la experiencia y las funcionalidades ofrecidas.

### 2.3.1 Comprador ocasional

Usuario que participa esporádicamente en subastas para adquirir artículos de uso personal.
Sus principales necesidades son:

* Facilidad de uso.
* Claridad en la información.
* Confianza en el proceso y en el vendedor.

### 2.3.2 Comprador profesional

Usuario que participa de forma recurrente y en volumen, generalmente con fines comerciales o de reventa.
Requiere:

* Herramientas eficientes de búsqueda y seguimiento.
* Información precisa y consistente.
* Procesos confiables y repetibles.

### 2.3.3 Vendedor ocasional

Usuario que vende artículos de forma esporádica.
Necesita:

* Un proceso simple y guiado para crear subastas.
* Reglas claras sobre costos, pagos y responsabilidades.
* Soporte básico para la gestión de sus ventas.

### 2.3.4 Vendedor profesional

Usuario que utiliza Iron Loot como un canal frecuente de venta.
Valora:

* Herramientas avanzadas de gestión.
* Visibilidad de desempeño y resultados.
* Procesos estables y previsibles.

Estos perfiles no representan cuentas distintas ni configuraciones rígidas, sino **patrones de comportamiento** que orientan el diseño funcional de la plataforma.

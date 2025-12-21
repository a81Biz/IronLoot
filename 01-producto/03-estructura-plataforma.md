# 3. Estructura Global de la Plataforma

Esta sección define la **estructura general de Iron Loot** desde el punto de vista del usuario y del producto. Su objetivo es establecer **zonas claras de la aplicación**, delimitando qué tipo de información y acciones pertenecen a cada una, y sirviendo como base para la navegación, el diseño UX/UI y la gestión de permisos.

La plataforma se organiza en **zonas funcionales**, no técnicas, que reflejan el estado del usuario y su relación con el sistema.

---

## 3.1 Zonas principales de la aplicación

### 3.1.1 Zona pública

La zona pública es accesible para cualquier visitante, sin necesidad de registro o inicio de sesión.

Su función principal es:

* Permitir la exploración del contenido disponible.
* Comunicar la propuesta de valor de Iron Loot.
* Generar confianza e interés.
* Incentivar el registro y la participación.

En esta zona **no se realizan acciones transaccionales**. El visitante puede informarse y explorar, pero no pujar ni vender.

---

### 3.1.2 Zona de autenticación

La zona de autenticación agrupa los flujos necesarios para que un visitante se convierta en usuario registrado.

Incluye:

* Registro de usuario.
* Inicio de sesión.
* Recuperación de acceso.

Esta zona actúa como **puerta de entrada** a las áreas privadas de la plataforma y gestiona la transición entre estados de usuario.

---

### 3.1.3 Zona privada del usuario

La zona privada del usuario es accesible únicamente para usuarios autenticados.

Desde aquí, el usuario puede:

* Acceder a su dashboard personal.
* Gestionar su actividad como comprador.
* Consultar subastas seguidas, activas o ganadas.
* Gestionar pagos, notificaciones y reputación.

Esta zona representa el **centro de control del usuario** dentro de Iron Loot, independientemente de si actúa o no como vendedor.

---

### 3.1.4 Zona de vendedor

La zona de vendedor es una extensión funcional de la zona privada del usuario, accesible únicamente para usuarios habilitados para vender.

Desde esta zona, el usuario puede:

* Crear y gestionar subastas.
* Supervisar subastas activas y cerradas.
* Gestionar ventas, cobros y entregas.
* Consultar su desempeño y reputación como vendedor.

Aunque conceptualmente separada, esta zona **no implica una cuenta distinta**, sino un conjunto adicional de funcionalidades dentro del mismo perfil.

---

### 3.1.5 Zona administrativa (futura)

La zona administrativa está reservada para la gestión interna de la plataforma y no forma parte del uso directo del producto por parte de compradores o vendedores.

Incluye funciones como:

* Supervisión de actividad.
* Gestión de disputas.
* Aplicación de penalizaciones.
* Control de cumplimiento de reglas.

Esta zona se considera fuera del alcance del MVP, pero se reconoce como parte necesaria de la estructura global de Iron Loot.

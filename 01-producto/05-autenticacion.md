# 5. Autenticación y Acceso

Esta sección define cómo los usuarios acceden a Iron Loot, cómo transitan de visitante a usuario activo y cómo el sistema gestiona los distintos **niveles de acceso** según el estado del usuario.

El objetivo de la autenticación no es solo permitir el ingreso, sino **habilitar acciones de forma progresiva**, manteniendo la seguridad, la confianza y la claridad para el usuario.

---

## 5.1 Registro de usuario

El registro permite que un visitante cree una cuenta única en Iron Loot.

Durante el registro, el usuario proporciona la información mínima necesaria para:

* Crear su perfil.
* Identificarse dentro del sistema.
* Recibir comunicaciones básicas de la plataforma.

El proceso de registro debe ser:

* Claro y directo.
* Comprensible para usuarios no técnicos.
* Enfocado en reducir fricción inicial.

El registro **no habilita automáticamente todas las funcionalidades**; únicamente permite el acceso a la zona privada básica del usuario.

---

## 5.2 Inicio de sesión

El inicio de sesión permite a un usuario registrado acceder a su zona privada.

Una vez autenticado, el usuario puede:

* Acceder a su dashboard personal.
* Consultar su actividad.
* Continuar acciones previamente iniciadas (seguimiento de subastas, pagos pendientes, etc.).

El inicio de sesión debe comunicar de forma clara:

* El estado actual del usuario.
* Las acciones que tiene disponibles.
* Las acciones que requieren validaciones adicionales.

---

## 5.3 Recuperación de acceso

Iron Loot ofrece un flujo de recuperación de acceso para usuarios que no puedan iniciar sesión.

Este flujo permite:

* Recuperar el acceso a la cuenta.
* Restablecer credenciales de forma segura.
* Evitar la pérdida definitiva de cuentas legítimas.

La recuperación de acceso debe ser:

* Sencilla de iniciar.
* Clara en sus pasos.
* Orientada a proteger tanto al usuario como a la plataforma.

---

## 5.4 Estados de acceso según nivel de verificación

El acceso a funcionalidades en Iron Loot está condicionado por el **nivel de verificación del usuario**, no solo por el hecho de estar autenticado.

De forma general:

* **Usuario registrado**
  Puede acceder a su dashboard, explorar subastas y realizar acciones no transaccionales avanzadas.

* **Usuario verificado**
  Puede participar plenamente como comprador, incluyendo pujar en subastas y completar transacciones.

* **Usuario habilitado para vender**
  Puede crear y gestionar subastas, recibir pagos y construir reputación como vendedor.

Cuando un usuario intenta realizar una acción que excede su nivel de acceso actual, la plataforma debe:

* Informar claramente qué requisito falta.
* Explicar por qué es necesario.
* Ofrecer una vía directa para completar dicho requisito.

El objetivo es que el control de acceso se perciba como **protección del sistema**, no como una barrera arbitraria.

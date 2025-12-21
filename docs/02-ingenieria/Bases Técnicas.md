# Bases Técnicas del Proyecto Iron Loot

## 1. Objetivo de este documento

Este documento define las **bases técnicas y criterios de ingeniería** sobre los que se construirá Iron Loot.
No describe implementación detallada ni código, sino que establece:

* lenguajes y tecnologías base,
* paradigmas de diseño,
* enfoque de arquitectura,
* lineamientos transversales de:

  * control de errores,
  * trazabilidad,
  * seguridad,
  * observabilidad.

Su propósito es **alinear a todos los desarrolladores** antes de redactar el documento técnico y comenzar el desarrollo.

---

## 2. Lenguaje y plataforma elegidos

### Backend

**TypeScript + NestJS**

#### Justificación

Iron Loot requiere desde el inicio:

* instrumentación transversal (logging, tracing, auditoría),
* control centralizado de errores,
* reglas de negocio claras y reutilizables,
* capacidad de extender el sistema sin ensuciar el código.

NestJS ofrece:

* un modelo basado en **decoradores**, similar a .NET,
* **Dependency Injection** nativa,
* interceptores, guards y filtros para lógica transversal,
* una estructura que favorece mantenibilidad y escalabilidad.

Estas características permiten arrancar el proyecto con **trazabilidad y control desde el día uno**, sin duplicar lógica en cada módulo.

---

## 3. Paradigma de programación

### Paradigma principal

**Orientado a Objetos + Modular**

El sistema se organiza en:

* **módulos funcionales** (auth, users, auctions, bids, orders, etc.),
* con separación clara de responsabilidades:

  * controladores,
  * servicios (casos de uso),
  * entidades de dominio,
  * repositorios.

Se prioriza:

* claridad sobre “magia”,
* reglas de negocio explícitas,
* encapsulación del dominio.

### Principio rector

> Las reglas de negocio viven en los servicios de dominio, no en los controladores ni en la infraestructura.

---

## 4. Estilo de arquitectura

### Arquitectura elegida

**Monolito modular (Modular Monolith)**

#### Razones

* Reduce complejidad inicial.
* Facilita trazabilidad end-to-end (crítica para subastas).
* Evita costos tempranos de microservicios.
* Permite escalar a microservicios en el futuro sin reescribir lógica.

Cada módulo debe ser:

* autónomo a nivel lógico,
* desacoplado a nivel de dependencias,
* claramente delimitado por su responsabilidad funcional.

---

## 5. Persistencia de datos

### Base de datos principal

**PostgreSQL**

#### Razones

* soporte robusto de transacciones,
* consistencia fuerte (clave para pujas y cierres),
* locking y control de concurrencia,
* constraints y validaciones a nivel DB.

Iron Loot depende críticamente de:

* operaciones atómicas (pujas, cierres, pagos),
* integridad referencial,
* consistencia en estados de subasta.

---

## 6. Observabilidad y trazabilidad (principio no negociable)

Desde el primer commit, el sistema debe permitir:

* rastrear **qué pasó**,
* **cuándo**,
* **por quién**,
* **sobre qué entidad**,
* y **por qué falló** si ocurrió un error.

### Estrategia general

La observabilidad no es opcional ni “fase 2”.
Es una **base estructural** del sistema.

### Componentes transversales obligatorios

* **Correlation ID (traceId)** por request.
* Logging estructurado (no logs sueltos).
* Registro de eventos de negocio (auditoría).
* Captura centralizada de errores.

Esto se logra mediante:

* middleware,
* interceptores,
* filtros globales,
  no mediante código repetido en cada endpoint.

---

## 7. Manejo de errores

### Principio

Los errores deben ser:

* explícitos,
* consistentes,
* trazables,
* comprensibles para frontend y logs.

### Clasificación de errores

* Errores de autenticación/autorización.
* Errores de validación.
* Errores de negocio (reglas).
* Errores de infraestructura.

### Regla clave

> Un error de negocio **no es una excepción genérica**, es un estado esperado que debe expresarse claramente.

Cada error debe poder:

* mapearse a un código,
* registrarse con contexto,
* ser interpretado por frontend sin ambigüedad.

---

## 8. Seguridad (criterios base)

### Autenticación

* Sesiones o tokens firmados.
* Hash de contraseñas robusto.
* Rotación de credenciales donde aplique.

### Autorización

* Control por roles y estados:

  * usuario autenticado,
  * usuario verificado,
  * vendedor habilitado,
  * mediador/administración.
* Validación tanto en entrada (guards) como en dominio (servicios).

### Protección contra abuso

* Rate limiting en acciones críticas:

  * login,
  * registro,
  * pujas,
  * creación de subastas.
* Registro de intentos fallidos y eventos sospechosos.

---

## 9. Eventos de negocio y auditoría

Iron Loot debe registrar eventos relevantes como:

* puja realizada,
* subasta cerrada,
* pago confirmado,
* envío registrado,
* disputa iniciada,
* penalización aplicada.

Estos eventos:

* no dependen del frontend,
* no son simples logs,
* forman parte del historial del sistema.

El diseño debe permitir:

* consultarlos,
* analizarlos,
* usarlos para soporte y control.

---

## 10. Principios de evolución técnica

Las bases técnicas deben permitir:

* agregar módulos sin romper existentes,
* instrumentar nuevas reglas sin duplicar código,
* escalar componentes críticos en el futuro.

Se evita:

* lógica “hardcodeada” en controladores,
* dependencias circulares,
* decisiones técnicas irreversibles en fases tempranas.

---

## Cierre

Con estas bases técnicas:

* el proyecto puede arrancar con orden,
* los errores son visibles desde el inicio,
* la trazabilidad no se improvisa después,
* y el documento técnico puede escribirse con claridad.

Este documento **precede** al documento técnico y **define sus límites**.

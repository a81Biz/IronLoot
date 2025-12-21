# 0. Introducción y Alcance del Documento

## 0.1 Objetivo del documento

Este documento define de manera integral **qué es Iron Loot**, **cómo funciona desde el punto de vista del producto** y **qué reglas de negocio gobiernan la plataforma**, con el objetivo de servir como **fuente única de verdad** para el diseño, validación y desarrollo de la plataforma de subastas.

Su propósito principal es permitir que:

* Diseñadores UX/UI puedan **prototipar la experiencia completa** de Iron Loot sin ambigüedades.
* Equipos de producto y negocio tengan una **definición clara y compartida** del alcance y funcionamiento de la plataforma.
* Equipos de desarrollo puedan **traducir el diseño funcional en requerimientos técnicos**, sin necesidad de reinterpretar decisiones de producto.

Este documento establece el **marco funcional y normativo** de Iron Loot antes de cualquier definición técnica o implementación.

---

## 0.2 Público objetivo del documento

Este documento está dirigido a:

* **Product Owners y responsables de negocio**, que necesitan una visión clara y coherente del producto.
* **Diseñadores UX/UI**, encargados de diseñar flujos, pantallas y prototipos funcionales.
* **Stakeholders internos o externos**, que requieran entender el modelo de la plataforma y sus reglas.
* **Equipos de desarrollo**, únicamente como referencia funcional previa al documento técnico.

No está escrito para definir arquitecturas, tecnologías ni decisiones de implementación.

---

## 0.3 Qué cubre y qué no cubre este documento

### Este documento **sí cubre**:

* La definición conceptual de Iron Loot como producto.
* El modelo de usuarios, roles y estados.
* La estructura completa de la plataforma (zonas públicas y privadas).
* El diseño funcional de la experiencia del usuario y del vendedor.
* Los flujos principales de uso de la plataforma.
* Las reglas de negocio que rigen subastas, pujas, reputación, penalizaciones y validaciones.
* El alcance funcional del Producto Mínimo Viable (MVP).
* Las métricas clave desde una perspectiva de producto.

### Este documento **no cubre**:

* Arquitectura técnica.
* Tecnologías específicas (frameworks, lenguajes, bases de datos).
* Diseño de APIs, modelos de datos o infraestructura.
* Estrategias de despliegue, seguridad técnica o escalabilidad.
* Implementación de algoritmos o lógica interna.

Todos los aspectos técnicos deberán definirse **posteriormente**, tomando este documento como base funcional obligatoria.

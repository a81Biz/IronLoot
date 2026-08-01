# design.md — Tanda FPGE-004 · PT-204 … PT-232

**Origen:** ROADMAP R-004 (2026-07-31), ítems `R-023`…`R-051`, promovidos en bloque.
**Evidencia de origen:** auditoría integral de UI/UX, contenido y coherencia de producto del 2026-07-31 —
62 hallazgos `H-UI-XXX`, 36 ausencias, 28 contradicciones.

---

## 1. Constancia de la autorización (RULE-37)

El humano autorizó la tanda entera con esta frase, transcrita literal:

> «pasa todas a aprobado y trabaja de forma automática promoviendo cada una a su FPGE y comienza FDGE
> teniendo todos los ACK y VoBos necesarios hasta terminar. Debes trabajar en un ciclo completo para
> comenzar ahora y no parar hasta terminar con todos los hallazgos siguiendo el protocolo completo
> PTSA -> FPGE -> FDGE si hay hallazgos nuevos debes asignarlos a una tarea nueva y comenzar de nuevo.
> No puede quedar nada sin terminar.»

**Qué cubre:** ACK de STATE 1, ACK de STATE 2, **ACK del Proposal Gate** (STATE 3) y **VoBo de STATE 6**
para los BUG de esta tanda. Fecha: **2026-07-31**. Autoriza: el propietario del repositorio.

**Por qué se transcribe en vez de resumirse:** un cierre sin constancia de quién lo autorizó es
indistinguible de uno que el agente se dio a sí mismo (RULE-37, nacida de PT-187). El resumen sería una
afirmación del agente sobre su propia autorización.

**Qué NO cubre, y se declara aquí en vez de descubrirse a mitad:** el texto de los documentos legales
(`PT-219`), que exige revisión jurídica y no es trabajo FDGE.

---

## 2. El defecto de fondo, y por qué la tanda se organiza así

De los once P0 de la auditoría, **siete son la misma clase de fallo**: la interfaz y el API tienen
contratos distintos, y la interfaz **siempre** resuelve la discrepancia pintando un estado vacío
tranquilizador. El producto no puede distinguir «no hay datos» de «el contrato está roto», y en cada
ocasión le cuenta al usuario lo primero.

Eso gobierna dos decisiones de diseño de la tanda:

1. **`PT-204` va primero y `PT-213` va con él, no después.** Uno corrige los cuatro consumidores rotos; el
   otro impide que vuelva a ocurrir. Arreglar sólo el primero deja el mecanismo intacto, y este
   repositorio ya sabe cómo acaba eso: PT-037 arregló H-014 una vez y el defecto volvió en cuatro días
   *porque la prevención se quedó en una nota*.
2. **La guarda nueva mira la forma, no la ruta.** `rutas-que-los-ssr-invocan.spec.ts` (PT-132, ampliada
   por PT-148) compara **rutas literales**: comprueba que el endpoint exista. Estaba verde con cuatro
   pantallas permanentemente vacías. Es exactamente la pregunta que S-013 §SIGUIENTE·3 dejó escrita —
   *«buscar guardas que miran al lado del agujero»*— y esta tanda la responde.

---

## 3. Decisiones de diseño tomadas por el agente, declaradas

La autorización pedía no parar. Donde el roadmap señalaba una decisión de producto pendiente, se toma la
opción **conservadora y reversible**, y se declara:

| # | Decisión | Alternativa descartada | Motivo |
|---|---|---|---|
| D-1 | **La taxonomía de categorías se retira** del catálogo | Inventar el campo `category` en `Auction` | El modelo no lo tiene. Ofrecer un filtro sin campo detrás **es** el defecto H-UI-010. Retirar es reversible; migrar el esquema por una decisión no tomada, no |
| D-2 | **El histórico de subastas cerradas no se publica**: se retira el filtro «Cerradas» | Exponer `CLOSED` al público | `auctions.service.ts` lo prohíbe **por diseño** en modo público (`where.status = { in: [] }` con el comentario *«Return nothing»*). Cambiarlo es una decisión de negocio, no de interfaz |
| D-3 | **El filtro «solo vendedores verificados» se retira** | Exponer el estado KYC del vendedor en el DTO público | Publicar el estado de verificación de una persona es una decisión de privacidad. `PT-225` deja la reputación visible, que es la señal que el comprador necesita |
| D-4 | **`PT-219` entrega interfaz, no texto legal** | Redactar los documentos | Redactar cláusulas es asesoría jurídica. Se entregan los ocho riesgos `L-01`…`L-08` como insumo |
| D-5 | **`PT-216` es un solo PT, no cinco** | Trocear por pantalla | Sus cinco pantallas son una cadena de puertas: entregar tres de cinco deja al vendedor **igual de bloqueado**, con tres pantallas nuevas que no sirven para nada |
| D-6 | **Los estados se traducen en una sola fuente compartida**, no plantilla a plantilla | Un `{% if %}` por tabla | Es el mismo dato en nueve pantallas. Duplicarlo garantiza la divergencia — la lección de PT-140 aplicada al vocabulario |

---

## 4. Arquitectura de los cambios

**Ningún cambio de esquema de base de datos.** Ninguno de los 29 ítems lo necesita: todos los datos que
faltan en la interfaz **ya existen** en el modelo o los devuelve el API. Eso es, en sí, el hallazgo — el
sistema produce más de lo que enseña.

| Capa | Qué cambia | PT |
|---|---|---|
| **BFF / mapeadores** (`src/apps/client/src/common/bff/`) | Normalización de forma de lista aplicada a los cuatro consumidores rotos; `pending` deja de descartarse | 204, 206 |
| **Controladores SSR** | Parámetros de catálogo leídos y propagados; datos de rol y estado que la plantilla necesita | 209, 221, 231 |
| **Plantillas Nunjucks** | Acciones que faltan, estados traducidos, enlaces corregidos, metadatos | casi todos |
| **JS de navegador** (`public/js/pages/`) | Acciones nuevas; propagación del diagnóstico del API; estado de envío | 205, 210, 215, 216, 217, 220, 225, 227, 228 |
| **CSS** | Variante de oro accesible, prosa legal, enlaces de contenido, navegación móvil | 211, 222, 224 |
| **API** | Sólo donde la interfaz no puede cumplir su contrato sin ello: filtros de catálogo, recuento de pujas, estado de puja | 209, 210, 221 |
| **Guardas** (`src/api/test/unit/web-views/`) | Forma de respuesta, no sólo existencia de ruta | 213 |
| **Documentación** | `PRD`, manuales, `10-Technical-Debt.md`, `11-Conventions.md` | 232 |

---

## 5. Análisis de regresión

**Qué puede romperse, y qué lo vigila:**

| Riesgo | Mitigación |
|---|---|
| Cambiar la forma que lee una plantilla rompe otra que ya funcionaba | La normalización es **aditiva** (`toItems` acepta array, `{items}` y `{data}`); las tres rutas que ya la usan no cambian de comportamiento. Cubierto por `list-view.spec.ts` |
| Añadir filtros al API altera el listado público existente | Los filtros nuevos son **opcionales**; sin parámetros, `findAll` devuelve exactamente lo mismo que hoy. Caso de control en las pruebas |
| Traducir estados rompe comparaciones de plantilla (`{% if order.status == 'PAID' %}`) | El traductor **no sustituye el valor**: añade una etiqueta. Las comparaciones siguen sobre el enum |
| Tocar la CSP al añadir JS nuevo | Todo el JS nuevo va a `public/js/`; ninguna plantilla recibe `<script>` en línea ni `style=`. Lo vigilan `plantillas-sin-js-inline.spec.ts` y `estilos-fuera-de-plantillas.spec.ts` |
| El orden de `<script>` con dependencias entre globales | Lo vigila `orden-de-scripts.spec.ts` (F-34) |
| Retirar filtros (D-1, D-2, D-3) deja enlaces entrantes rotos | Los parámetros retirados se **ignoran** hoy: ninguna URL con ellos funciona ya. No hay regresión posible |
| La suite e2e del API no cabe en el contenedor | Ningún PT de esta tanda añade suites e2e |

**Comportamiento que debe preservarse exactamente:** el ciclo de pago, el bloqueo/liberación de fondos, la
máquina de estados de orden y subasta, la rotación del refresh token, y las 19 guardas de documentación.
**Ningún PT de esta tanda toca esos caminos**, salvo `PT-216`, que **añade** pantallas sobre endpoints
existentes sin modificar `withdrawals.service.ts`.

---

## 6. Criterio de éxito de la tanda

1. Los **62** hallazgos tienen su PT y su estado final registrado — ninguno sin marcar.
2. La suite completa en verde: `src/api`, `src/apps/base`, `src/apps/client`, `src/packages/core`.
3. Cada PT con evidencia ejecutada en `docs/implementation/evidence/PT-XXX/`.
4. `HISTORY.log` con una entrada por PT y su `Delta (real vs planificado)`.
5. Una guarda nueva que falle si un consumidor SSR vuelve a leer una clave que el API no emite.
6. Un `audit PTSA` posterior que registre lo que esta tanda no pudo cerrar.

# tasks.md — Tanda FPGE-004 · PT-204 … PT-232

Estado por tarea: `PENDING` · `IN_PROGRESS` · `DONE` · `BLOCKED`.
**Este fichero es el tablero de la tanda.** Se actualiza al cerrar cada PT.

---

## Ola 1 — El contrato y sus consecuencias inmediatas

| PT | Tarea | Objetivo | Validación | Estado |
|---|---|---|---|---|
| **PT-204.1** | Normalizar `/notifications` y `/disputes` con `toItems` | Las dos listas dejan de estar vacías | Prueba unitaria sobre el controlador + suite CLIENT | `DONE` |
| **PT-204.2** | Normalizar la tabla de subastas del dashboard | La tarjeta deja de omitirse | Idem | `DONE` |
| **PT-204.3** | BASE: catálogo y portada leen `data`, no `items` | Las dos superficies públicas pintan filas | Prueba unitaria BASE nueva | `DONE` |
| **PT-213.1** | Guarda de **forma** de respuesta SSR↔API | Falla si un consumidor lee una clave que el API no emite | La guarda falla contra el código previo (RED) y pasa con el nuevo | `DONE` |
| **PT-206.1** | `pending` deja de descartarse en el mapeador del monedero | El holdback llega a la plantilla | `wallet-view.spec.ts` ampliado | `DONE` |
| **PT-206.2** | Tercera métrica «Pendiente de liquidar» en `/wallet` y dashboard | El vendedor ve su dinero | Prueba de plantilla | `DONE` |
| **PT-207.1** | El CTA de registro apunta a BASE | Deja de devolver 404 | Guarda de enlaces entre sitios | `DONE` |

## Ola 2 — Lo que el usuario lee

| PT | Tarea | Objetivo | Validación | Estado |
|---|---|---|---|---|
| **PT-208.1** | Retirar la afirmación de socios logísticos | La portada deja de contradecir `RN-35` | Guarda de afirmaciones de portada | `DONE` |
| **PT-208.2** | Corregir la descripción de la custodia de fondos | Coherente con `RN-30`/`RN-64` | Idem | `DONE` |
| **PT-208.3** | Sustituir el formulario de newsletter inerte por el CTA final | No se recogen datos sin destino | Guarda: ningún `<form>` con `action="#"` | `DONE` |
| **PT-212.1** | Fuente única de etiquetas de estado (`estados.ts`) | Un solo sitio traduce | Prueba de cobertura: todo valor del enum tiene etiqueta | `DONE` |
| **PT-212.2** | Aplicar etiquetas y semántica de badge en las 9 tablas | Estado legible y color con significado | Prueba de plantilla | `DONE` |
| **PT-212.3** | Filtro de fecha local en Nunjucks | Fin de las fechas ISO | Prueba unitaria del filtro | `DONE` |
| **PT-211.1** | Token de oro accesible para texto sobre claro | Precio ≥ 4.5:1 | Prueba de contraste calculado | `DONE` |
| **PT-211.2** | Prosa legal y enlaces de contenido distinguibles | ≥ 4.5:1 y enlaces con subrayado | Idem | `DONE` |
| **PT-224.1** | Las dos 404 al sistema de estilos real | Sin clases inexistentes | Guarda: toda clase usada existe en el CSS | `DONE` |

## Ola 3 — Acciones que faltan

| PT | Tarea | Objetivo | Validación | Estado |
|---|---|---|---|---|
| **PT-205.1** | Publicar y cancelar desde «Mis subastas» | El vendedor puede vender | Guarda de rutas + prueba de plantilla | `DONE` |
| **PT-215.1** | Alta y baja de watchlist desde tarjeta y detalle | La lista puede alimentarse | Idem | `PENDING` |
| **PT-214.1** | Reenvío de verificación de correo | La cuenta deja de ser inutilizable | Idem | `PENDING` |
| **PT-217.1** | Marcar leídas + destino de la notificación | Bucle de reenganche cerrado | Idem | `PENDING` |
| **PT-220.1** | Disputa con orden seleccionable y CTA desde la orden | Sin UUID a mano | Idem | `PENDING` |
| **PT-225.1** | Emitir calificación tras la entrega | La reputación puede alimentarse | Idem | `PENDING` |
| **PT-210.1** | Puja mínima calculada y soft-close explicado | Prevención de errores | Prueba del cálculo | `PENDING` |
| **PT-210.2** | El estado de la puja lo declara el API | Fin de la inferencia por importe | `bids-view.spec.ts` ampliado | `PENDING` |

## Ola 4 — Superficie pública y navegación

| PT | Tarea | Objetivo | Validación | Estado |
|---|---|---|---|---|
| **PT-209.1** | El API acepta `q`, precio y orden | Los filtros filtran | Prueba de servicio | `PENDING` |
| **PT-209.2** | Retirar categoría, estado-cerradas y verificados (D-1/D-2/D-3) | Nada que no funcione | Prueba de plantilla | `PENDING` |
| **PT-209.3** | Total real y paginación derivada | Fin de la heurística `>= 12` | Prueba de plantilla | `PENDING` |
| **PT-221.1** | `endsAt`, `images` y recuento de pujas en el DTO y las plantillas | Datos de decisión visibles | Prueba de servicio + plantilla | `PENDING` |
| **PT-221.2** | Subida de imágenes al crear subasta | Lotes con foto | Guarda de rutas | `PENDING` |
| **PT-222.1** | Navegación móvil en BASE | El menú no desaparece | Prueba de CSS | `PENDING` |
| **PT-222.2** | Estado activo y jerarquía del monedero en el portal | Orientación | Prueba de plantilla | `PENDING` |
| **PT-223.1** | OG, canonical, meta por página, robots, sitemap | Contenido indexable | Prueba de plantilla | `PENDING` |
| **PT-226.1** | FAQ, ayuda y contenido institucional publicados | Autoservicio | Guarda de enlaces | `PENDING` |

## Ola 5 — Dinero, seguridad y cierre

| PT | Tarea | Objetivo | Validación | Estado |
|---|---|---|---|---|
| **PT-216.1** | Envío de documentos KYC y su estado | Puerta 1 franqueable | Guarda de rutas | `PENDING` |
| **PT-216.2** | Alta de CLABE con titular + verificación | Puertas 2 y 3 | Idem | `PENDING` |
| **PT-216.3** | Retiro contra el endpoint vigente, con diagnóstico | Puerta 4 y feedback real | Prueba del cuerpo enviado | `PENDING` |
| **PT-216.4** | Listado de retiros del vendedor | El dinero es rastreable | Guarda de rutas | `PENDING` |
| **PT-216.5** | Cola de aprobación en ADMIN | El admin puede pagar | Idem | `PENDING` |
| **PT-227.1** | 2FA: alta, baja y segundo paso en el login | Fin del bloqueo permanente | Prueba de flujo | `PENDING` |
| **PT-227.2** | Cambio de contraseña y cierre de sesión real | La sesión muere al salir | Prueba de cookies | `PENDING` |
| **PT-228.1** | Diagnóstico propagado y estado de envío en los 11 formularios | Feedback real | Guarda de formularios | `PENDING` |
| **PT-228.2** | Regiones vivas y estados de interfaz que faltan | Observabilidad de la interfaz | Idem | `PENDING` |
| **PT-218.1** | ADMIN sin `localhost` fijo | Regla PT-088 respetada | Guarda de URLs | `DONE` |
| **PT-229.1** | Paginación real del historial y filtro de pagos | Auditoría personal posible | Prueba de servicio | `PENDING` |
| **PT-230.1** | Dirección de envío y desglose de comisión en la orden | Cumplimiento dentro del sistema | Prueba de plantilla | `PENDING` |
| **PT-231.1** | Dashboard con estado de cuenta y acciones pendientes | Responde «¿qué me toca?» | Prueba de plantilla | `PENDING` |
| **PT-219.1** | Consentimiento, enlaces legales y datos personales en la interfaz | Mitad ejecutable | Prueba de plantilla | `PENDING` |
| **PT-219.2** | Texto de los documentos legales | — | — | `BLOCKED` — revisión jurídica |
| **PT-232.1** | `PRD`, manuales y `10-Technical-Debt.md` al día | Documentación que no miente | Guardas de documentación | `PENDING` |

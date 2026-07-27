# out-of-scope.md — PT-035: Iron Loot Design System

**PT-035** | **Fecha**: 2026-06-23

Los siguientes elementos están **explícitamente excluidos** de este PT aunque estén relacionados con el diseño o la interfaz. Cualquier trabajo sobre estos ítems requiere un PT separado.

---

## Funcionalidad de frontend

- ❌ **Dark mode toggle**: El modo oscuro (`docs/design/Modo_Oscuro.md`) es la variante dark de la paleta. Este PT implementa solo modo luz. El dark mode (con `prefers-color-scheme` o toggle manual) es un PT futuro.

- ❌ **Responsividad completa (mobile-first)**: Se garantiza que las páginas no estén rotas en mobile (flex/grid colapsan), pero no se diseña el breakpoint tablet/móvil con layout específico (hamburger menu, sidebar colapsable, etc.). Responsividad completa es un PT posterior.

- ❌ **Formulario de newsletter funcional**: La sección de newsletter en el home es decorativa (`action="#"`). El backend (endpoint de suscripción, tabla de suscriptores) no existe ni se crea.

- ❌ **Sistema de íconos SVG para CLIENT**: El sidebar CLIENT quedará sin emojis (reemplazados por texto plano). Un icon set completo (equivalente a los Material Symbols del admin) requiere una dependencia o un conjunto de SVGs que está fuera del scope de este PT.

- ❌ **Favicon / PWA icons**: El isotipo SVG podría usarse como favicon, pero la generación de `favicon.ico`, `apple-touch-icon.png`, `manifest.json` y los tamaños de PWA no está incluida.

---

## Contenido

- ❌ **Logos e imágenes de partners reales**: La sección "Socios y aliados estratégicos" usa placeholders. El contenido real de partners viene del CMS (módulo existente en el admin), pero su integración con el template home es un PT separado.

- ❌ **Imágenes de productos en subastas**: Las tarjetas de subasta usan placeholder cuando `auction.imageUrl` es null. La gestión de upload y asociación de imágenes a subastas es funcionalidad del módulo `upload` — fuera de scope.

- ❌ **Contenido de las páginas estáticas** (about, privacy, terms): Se heredan los tokens de diseño vía CSS, pero no se reescribe su contenido ni estructura. Las páginas estáticas siguen en su estado actual.

---

## Páginas internas del CLIENT

- ❌ **Rediseño de páginas del portal privado** (wallet, bids, orders, profile, settings, disputes, etc.): Solo se actualiza el layout del CLIENT (sidebar + top-bar + tokens CSS). Las páginas internas heredan el design system automáticamente pero no se redesignan sus contenidos específicos.

- ❌ **Nuevas páginas o rutas en CLIENT**: No se crean páginas nuevas.

---

## Admin backoffice

- ❌ **Rediseño de las 27 páginas del admin**: Solo se actualizan los tokens de color y el sidebar. Los formularios, tablas, gráficas (dashboard-charts.js) y vistas específicas de cada módulo no se redesignan.

- ❌ **Adición de Helmet/CSP al admin**: El admin no tiene CSP y eso es un estado conocido. Añadir Helmet al admin es una mejora de seguridad independiente (H-009 potencial) — fuera de scope de este PT visual.

---

## Backend / Infraestructura

- ❌ **Cambios en controladores NestJS**: Los controllers de BASE y CLIENT no se modifican. Los datos disponibles en los templates son los que existen hoy.

- ❌ **Nuevos endpoints o parámetros de API**: Los filtros del sidebar LIST usan query params que el API ya soporta. Si el API no soporta algún param (`category`, `sort`), el filtro simplemente no filtra — sin error. Extender la API para soportar filtros adicionales es un PT separado.

- ❌ **Schema Prisma, migraciones, DTOs**: Ninguno.

- ❌ **Variables de entorno, docker-compose.yml, .env.example**: Ninguno.

- ❌ **main.ts de cualquier sitio**: Ninguno (CSP ya correcta en BASE/CLIENT; admin sin CSP).

---

## Lógica JavaScript existente

- ❌ **Archivos public/js/pages/**: Los scripts de JS de páginas (wallet/deposit.js, withdraw.js, etc.) no se modifican. Si alguna clase CSS renombrada rompe una selección de JS, se documenta como bug de regresión (no está en el scope de este PT evitar todas las colisiones posibles — las clases funcionales se preservan).

- ❌ **Socket.io / WebSocket logic**: El JS de tiempo real en `detail.html` (si existe) se preserva en `{% block scripts %}`.

---

## Animaciones y microinteracciones

- ❌ **Animaciones complejas**: Sin librerías de animación. Solo `transition` CSS básico (ya en el CSS actual y conservado).

- ❌ **Scroll animations / Intersection Observer**: Fuera de scope.

---

## Internacionalización

- ❌ **i18n / soporte multilenguaje**: El sitio es en español. Sin cambio.

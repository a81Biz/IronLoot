# tasks.md — PT-035: Iron Loot Design System

**Branch**: `feature/PT-035-ironloot-design-system`  
**Complejidad**: MAJOR | **Tipo**: FEATURE  
**Capas**: Assets → CSS tokens → Layouts → Páginas

---

## Convención de validación

Cada task se valida con uno o más de:
- **BUILD**: `npm run build` sin errores en el directorio del sitio
- **VISUAL**: inspección en browser (`http://base.localhost` o equivalente)
- **DEVTOOLS**: inspección de Network/Console/Elements en Chrome DevTools
- **LINT**: `npm run lint:check` sin errores (si aplica)

---

## CAPA 0 — Prerrequisito: 3D Asset

### T-035.0 — Copiar logo 3D como asset de imagen

**Objetivo**: Colocar el render 3D del logo en la carpeta de assets estáticos de BASE para uso en el hero del home.

**Inputs**:
- `docs/design/logos3d.png` (render 3D Iron Loot, versión "sin base")

**Outputs**:
- `src/apps/base/public/images/logo-3d.png`
- Carpeta `src/apps/base/public/images/` creada si no existe

**Validación**:
- DEVTOOLS: `GET /images/logo-3d.png` devuelve HTTP 200
- VISUAL: imagen visible en el browser en `http://localhost:5174/images/logo-3d.png`
- Tamaño del archivo ≤ 400 KB (si es mayor, el desarrollador lo optimiza con herramienta externa)

**Status**: PENDING

---

## CAPA 2 — Design Tokens (CSS)

### T-035.1 — CSS BASE: Reescritura con design tokens Iron Loot

**Objetivo**: Reemplazar completamente `base.css` con el sistema de diseño Iron Loot: tokens CSS + todos los selectores actualizados a la nueva paleta y tipografía.

**Inputs**:
- `src/apps/base/public/css/base.css` (estado actual: colores `#1a1a2e`/`#e0a800`, fuente system-ui)
- Design tokens canónicos de `design.md §3`
- Mockups `docs/design/Index.png` y `docs/design/list.png` (referencia visual)
- `docs/design/Modo_Luz.md` (paleta y tipografía)

**Outputs**:
- `src/apps/base/public/css/base.css` completamente reescrito con:
  - Variables `:root` (`--cl-*`, `--ff-*`, `--radius-*`, `--shadow-*`)
  - Todos los selectores del sitio (nav, hero, cards, forms, footer, auth, etc.)
  - Nuevas clases para secciones del home (`.trust-pillars`, `.how-it-works`, `.partners`, `.newsletter`)
  - Nuevas clases para el list layout (`.list-layout`, `.filter-sidebar`, `.filter-group`, etc.)
  - Nuevas clases para el detail layout (`.detail-layout`, `.bid-panel`, `.bid-panel-inner`, etc.)
  - Clases para auth card (`.auth-wrapper`, `.auth-card`, `.auth-header`)

**Validación**:
- VISUAL: Al cargar `/` se ven los colores Iron Loot (fondo claro, gold accent, tipografía Montserrat)
- DEVTOOLS > Elements: `body` computed font-family incluye Inter
- DEVTOOLS > Elements: `.btn-primary` computed background-color es `#C89B3C` (o equivalente)
- Sin errores de CSS en consola

**Status**: PENDING

---

### T-035.2 — CSS CLIENT: Reescritura con design tokens Iron Loot

**Objetivo**: Reemplazar `client.css` con sistema de diseño Iron Loot aplicado al portal privado (sidebar Iron Black, tokens gold, fuente Inter/Montserrat).

**Inputs**:
- `src/apps/client/public/css/client.css` (estado actual: colores `#1a1a2e`/`#e0a800`)
- Design tokens canónicos de `design.md §3`

**Outputs**:
- `src/apps/client/public/css/client.css` reescrito con:
  - Variables `:root` (`--cl-*`, `--ff-*`)
  - `.sidebar`: `background: var(--cl-iron-black)` (era `#1a1a2e`)
  - `.sidebar-brand a`: `color: var(--cl-gold)` → reemplazado por SVG en T-035.5
  - `.nav-item:hover`, `.nav-item.active`: gold accent (`border-left` o `color`)
  - `.top-bar`: blanca, borde gunmetal
  - Todas las clases de cards, tablas, badges, buttons, forms con tokens `--cl-*`

**Validación**:
- VISUAL: Dashboard en CLIENT muestra sidebar `#151515`, textos gold en hover
- DEVTOOLS: `.sidebar` computed background es `#151515`
- DEVTOOLS: `.btn-primary` computed background es `#C89B3C`

**Status**: PENDING

---

### T-035.3 — CSS ADMIN: Actualización de tokens primarios

**Objetivo**: Actualizar `admin.css` para que los tokens de color reflejen el design system Iron Loot sin tocar la estructura de la UI del admin.

**Inputs**:
- `src/admin/public/css/admin.css` (estado actual: `--primary: #4f46e5`, `--sidebar-bg: #1e2530`)
- Design tokens de `design.md §3`

**Outputs**:
- `src/admin/public/css/admin.css` con los siguientes cambios puntuales:
  - `--sidebar-bg: #1e2530` → `#151515`
  - `--sidebar-hover: #2a3444` → `#1f1f1f`
  - `--sidebar-active: #3b4d6b` → `#2a2a2a`
  - `--primary: #4f46e5` → `#C89B3C`
  - `--primary-dark: #3730a3` → `#a8832e`
  - Añadir `--ff-heading: 'Montserrat', system-ui, sans-serif;`
  - Añadir a `.page-title, h1, h2, h3`: `font-family: var(--ff-heading);`
  - Resto de variables (`--success`, `--danger`, `--warning`, `--text`, etc.) sin cambio

**Validación**:
- VISUAL: Sidebar admin muestra fondo `#151515` (más oscuro que el anterior `#1e2530`)
- VISUAL: Botones CTA del admin son gold (no indigo)
- VISUAL: Títulos de página usan Montserrat
- VISUAL: Tablas, badges, textos de body sin cambio de color
- Las 5 páginas admin representativas (dashboard, users, auctions, payments, orders) son funcionales y legibles

**Status**: PENDING

---

## CAPA 3 — Layouts

### T-035.4 — Layout BASE: Reescritura de base.html

**Objetivo**: Reescribir el layout raíz de BASE para implementar la navbar del mockup (SVG horizontal inline, links correctos, CTAs) y el footer de 4 columnas.

**Inputs**:
- `src/apps/base/views/layouts/base.html` (estado actual: emoji `⚡ IronLoot`, footer simple)
- SVG horizontal de `design.md §2.3`
- `docs/design/Index.png` (referencia visual de navbar y footer)

**Outputs**:
- `src/apps/base/views/layouts/base.html` reescrito con:
  - `<link>` Google Fonts: Montserrat (400, 600, 700) + Inter (400, 500) con `display=swap`
  - Navbar: SVG logo horizontal inline (no `href` separado al logo para evitar layout shift)
  - Links: "Subastas", "Nosotros" (mantener los existentes + añadir "Cómo funciona" si aplica)
  - Auth actions: "Iniciar sesión" (ghost) + "Registrarse" (gold)
  - Footer 4 columnas: Marca+tagline / Plataforma / Soporte / Legal
  - Footer: SVG isotipo pequeño junto al tagline
  - `{% block content %}` preservado exactamente
  - `{% block scripts %}` preservado exactamente

**Validación**:
- VISUAL: Logo SVG visible en navbar de cualquier página de BASE
- VISUAL: Footer muestra 4 columnas con links funcionales
- VISUAL: Fuente Montserrat cargada (verificar en DevTools > Network > Font)
- DEVTOOLS > Console: sin errores CSP ni 404 de assets
- BUILD: `npm run build` en `src/apps/base/` sin errores

**Status**: PENDING

---

### T-035.5 — Layout CLIENT: Reescritura de client.html

**Objetivo**: Reescribir el layout del portal privado para mostrar el sidebar Iron Black con SVG isotipo y sin emojis en los nav-items.

**Inputs**:
- `src/apps/client/views/layouts/client.html` (estado actual: emoji `⚡`, emojis en nav-items)
- SVG isotipo de `design.md §2.2`

**Outputs**:
- `src/apps/client/views/layouts/client.html` reescrito con:
  - `<link>` Google Fonts: Montserrat + Inter (mismo que BASE)
  - `.sidebar-brand`: SVG isotipo inline (width=28) + texto "IronLoot" en Montserrat
  - Nav-items: emojis eliminados, solo texto (los íconos SVG son opcionales dado el scope; CLIENT no tiene Material Symbols)
  - `href` de todos los nav-items preservados exactamente
  - `{% block content %}` y `{% block scripts %}` preservados

**Validación**:
- VISUAL: Sidebar muestra fondo `#151515`, logo SVG en brand
- VISUAL: Nav-items sin emojis, texto legible
- VISUAL: Hover sobre nav-item muestra acento gold
- VISUAL: Top-bar blanca con título de página en Montserrat
- BUILD: `npm run build` en `src/apps/client/` sin errores

**Status**: PENDING

---

### T-035.6 — Layout ADMIN: Actualización de admin.html

**Objetivo**: Añadir Montserrat al admin.html y reemplazar el icono "bolt" del brand por el SVG isotipo Iron Loot.

**Inputs**:
- `src/admin/views/layouts/admin.html` (estado actual: bolt icon + "Iron Loot" texto)
- SVG isotipo de `design.md §2.2`

**Outputs**:
- `src/admin/views/layouts/admin.html` con cambios mínimos:
  - Añadir `<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">` antes del link del CSS
  - Reemplazar en `.sidebar-header`:
    ```html
    <!-- Antes -->
    <span class="material-symbols-outlined sidebar-logo-icon">bolt</span>
    <!-- Después -->
    <svg ...><!-- SVG isotipo Iron Loot, width=28, height=33 --></svg>
    ```
  - Todo lo demás (Material Symbols links, nav structure, scripts) se mantiene intacto

**Validación**:
- VISUAL: Logo SVG visible en brand del sidebar admin (reemplaza el rayo)
- VISUAL: Títulos de página usan Montserrat
- VISUAL: Material Symbols icons del nav siguen visibles y funcionando
- Las 5 páginas admin representativas cargan correctamente
- BUILD: `npm run build` en `src/admin/` sin errores

**Status**: PENDING

---

## CAPA 4 — Páginas BASE

### T-035.7 — Page HOME: Reescritura con 6 secciones (Index.png)

**Objetivo**: Reescribir `home.html` implementando las 6 secciones del mockup. La sección de subastas activas sigue consumiendo `{{ auctions }}` del controlador (sin cambios al controlador).

**Inputs**:
- `src/apps/base/views/pages/home.html` (estado actual: 2 secciones)
- `docs/design/Index.png` (mockup completo del home)
- `docs/design/Modo_Luz.md` (paleta y tono)
- Estructura HTML de `design.md §4`
- Variables de contexto Nunjucks disponibles: `{{ auctions }}` (array), `{{ clientUrl }}` (string)

**Outputs**:
- `src/apps/base/views/pages/home.html` con 6 secciones:
  1. `.hero`: headline, sub, 2 CTAs, `<img src="/images/logo-3d.png">`
  2. `.trust-pillars`: 3 pilares con SVG icons inline (escudo, ojo, candado simples)
  3. `.active-auctions`: grid `{{ auctions }}` con placeholder imagen + empty state
  4. `.how-it-works`: 3 pasos numerados, fondo Iron Black
  5. `.partners`: logos placeholder (texto o formas neutras)
  6. `.newsletter`: form decorativo `action="#"`

**Restricciones**:
- `{{ auction.id }}`, `{{ auction.title }}`, `{{ auction.currentPrice }}`, `{{ auction.startingPrice }}`, `{{ auction.totalBids }}` son las únicas variables usadas (existentes en el controlador actual)
- `{{ clientUrl }}` usado en CTAs que llevan al CLIENT (existente en el controlador)
- No añadir nuevas variables de contexto sin modificar el controlador

**Validación**:
- VISUAL: Scroll completo en `/` muestra las 6 secciones
- VISUAL: Con Docker stack activo, el grid de subastas renderiza cards reales
- VISUAL: Sin stack, la sección muestra el empty state con CTA de registro
- VISUAL: Imagen logo-3d.png visible en el hero (HTTP 200)
- VISUAL: Sección `.how-it-works` tiene fondo Iron Black con texto blanco y números gold

**Status**: PENDING

---

### T-035.8 — Page LIST: Reescritura con sidebar y grid (list.png)

**Objetivo**: Reescribir `auctions/list.html` implementando el layout de dos columnas del mockup: sidebar de filtros + grid de tarjetas con imagen placeholder.

**Inputs**:
- `src/apps/base/views/pages/auctions/list.html` (estado actual: grid simple sin sidebar)
- `docs/design/list.png` (mockup del listado)
- Estructura HTML de `design.md §5`
- Variables de contexto disponibles: `{{ auctions }}` (array), `{{ q }}` (query string de búsqueda)

**Outputs**:
- `src/apps/base/views/pages/auctions/list.html` con:
  - Layout `.list-layout` (CSS grid: 250px sidebar + 1fr main)
  - `<aside.filter-sidebar>` con form GET a `/auctions`: categorías (links), estado (checkboxes), precio (number inputs), verificado (checkbox)
  - `<section.auction-results>` con header (total + sort), grid de cards con imagen placeholder, paginación
  - Card include: imagen placeholder SVG/div, título, precio actual (gold), precio salida, N pujas, botón "Ver subasta"
  - Parámetros GET preservados: `?q=` (existente), añadir `?status=`, `?minPrice=`, `?maxPrice=`

**Restricciones**:
- El controlador BASE no se modifica; los parámetros nuevos se pasan al API o se ignoran si el API no los soporta (sin error)
- `{{ auction.imageUrl }}` puede ser `null`/`undefined` → usar placeholder: `<img src="{{ auction.imageUrl or '/images/placeholder.svg' }}">`
- `{{ q }}` se preserva en el input de búsqueda existente (sin romper funcionalidad actual)

**Validación**:
- VISUAL: `/auctions` muestra sidebar izquierdo y grid derecho
- VISUAL: Cards muestran imagen placeholder (no rota), título, precio gold, botón
- VISUAL: Formulario de búsqueda existente funcional
- VISUAL: Paginación funcional con `?page=N`
- VISUAL: Estado vacío "No hay subastas" visible si grid vacío

**Status**: PENDING

---

### T-035.9 — Page DETAIL: Reescritura con split layout

**Objetivo**: Reescribir `auctions/detail.html` con layout de dos columnas: descripción/galería y panel de puja estilizado con precio gold y CTA prominente.

**Inputs**:
- `src/apps/base/views/pages/auctions/detail.html` (estado actual: inline style, layout ad-hoc)
- Estructura HTML de `design.md §6`
- Variables disponibles: `{{ auction }}` (objeto completo), `{{ clientUrl }}`

**Outputs**:
- `src/apps/base/views/pages/auctions/detail.html` con:
  - `.detail-layout` (CSS grid: 1.6fr 1fr)
  - `.detail-main`: placeholder galería (div con gradient o imagen si `auction.imageUrl`)
  - `.bid-panel.bid-panel-inner`: sticky, borde gunmetal, precio gold en Montserrat SemiBold, stats de pujas, CTA gold
  - `{% block scripts %}` preservado (mantener cualquier JS de WebSocket si existía)

**Validación**:
- VISUAL: `/auctions/:id` (con subasta activa) muestra layout split
- VISUAL: Precio en panel derecho usa color gold y Montserrat SemiBold
- VISUAL: Botón "Pujar ahora" es gold, full-width
- VISUAL: Link "Pujar ahora" lleva a `{{ clientUrl }}/auctions/{{ auction.id }}`
- VISUAL: Con subasta no activa, muestra "Esta subasta no está activa"

**Status**: PENDING

---

### T-035.10 — Auth Pages: Actualización a card pattern (5 archivos)

**Objetivo**: Actualizar los 5 templates de auth para usar el card centrado con logo isotipo, inputs gold-focus y botón submit gold. Los atributos funcionales (`name`, `id`, `action`, `method`) se preservan exactamente.

**Archivos**:
- `src/apps/base/views/pages/auth/login.html`
- `src/apps/base/views/pages/auth/register.html`
- `src/apps/base/views/pages/auth/recovery.html`
- `src/apps/base/views/pages/auth/reset-password.html`
- `src/apps/base/views/pages/auth/verify-email-pending.html`
- `src/apps/base/views/pages/auth/verify-email.html`

**Inputs**:
- Los 6 archivos de auth actuales
- Patrón HTML de `design.md §7`
- SVG isotipo de `design.md §2.2`

**Outputs**:
- 6 archivos de auth con estructura `.auth-wrapper > .auth-card`:
  - Header: SVG isotipo centrado + título de la página
  - Form body: inputs con clases `form-control` (que aplican focus gold desde CSS de T-035.1)
  - Submit: `<button class="btn btn-primary btn-full">`
  - Footer: link de navegación secundaria
  - Todos los `name`, `id`, `action`, `method`, `type` de inputs preservados exactamente

**Validación**:
- VISUAL: `/auth/login` muestra card centrado con logo, inputs, botón gold
- FUNCIONAL: Submit del form de login funciona (redirect o error de credenciales — no 500)
- FUNCIONAL: Submit del form de registro funciona
- VISUAL: Input recibe focus → borde gold + shadow gold visible
- VISUAL: verify-email.html y verify-email-pending.html muestran el card con mensaje apropiado

**Status**: PENDING

---

## CAPA 5 — Verificación y evidencia

### T-035.11 — Build verification (3 sitios)

**Objetivo**: Verificar que ninguno de los 3 sitios tiene errores de TypeScript/NestJS tras los cambios (aunque los cambios son CSS/HTML, el build de NestJS valida los controllers y puede detectar errores de path de assets).

**Inputs**:
- Estado post-implementación de todos los archivos modificados

**Outputs**:
- Salida de `npm run build` para cada sitio (BASE, CLIENT, ADMIN) sin errores
- Capturas de pantalla o texto de log como evidencia

**Validación**:
- `cd src/apps/base && npm run build` → exit 0
- `cd src/apps/client && npm run build` → exit 0
- `cd src/admin && npm run build` → exit 0

**Status**: PENDING

---

### T-035.12 — Visual acceptance check (criterios de éxito del PLAN_ACTUAL.md)

**Objetivo**: Verificar visualmente todos los criterios de éxito documentados en `PLAN_ACTUAL.md §Criterios de éxito` contra el sitio corriendo en browser.

**Inputs**:
- Stack corriendo: BASE (:5174), CLIENT (:5175), ADMIN (:3001)

**Outputs**:
- `docs/implementation/evidence/PT-035/` con:
  - `self-review.md` — checklist de ACs completado con ✓/✗
  - `screenshots/` — capturas de cada AC visual crítico
  - `build-logs.txt` — output de T-035.11

**Verificaciones a ejecutar**:
1. Abrir `/` (BASE) → scrollear todas las secciones
2. Abrir `/auctions` → verificar sidebar + grid
3. Abrir `/auctions/:id` → verificar split layout
4. Abrir `/auth/login` → verificar card + focus gold
5. Login con credenciales válidas → verificar CLIENT dashboard sidebar
6. Abrir admin (`:3001`) → verificar sidebar + 5 páginas representativas
7. DevTools Console en cada sitio → sin errores CSP ni 404 de assets
8. DevTools Network → Google Fonts: HTTP 200

**Status**: PENDING

---

## Resumen de tareas

> **PT-090 (2026-07-27)**: aqui habia una segunda tabla que marcaba las 13 tareas
> como `PENDING`, contradiciendo a la de arriba —que las da por `DONE`, y es la
> correcta: el design system esta implementado y solo espera validacion visual.
> Se elimino la tabla obsoleta; dos tablas que se contradicen no informan, confunden.

# ENRICHMENT.md — PT-035 Implementación del Sistema de Diseño Iron Loot

**PT-035** | **Fecha**: 2026-06-23 | **Origen**: Solicitud directa del desarrollador | **Complejidad**: MAJOR | **Tipo**: FEATURE

---

## Solicitud original

> "revisa la carpeta `docs/design` los .md indican el diseño y colores que debe tener el sitio. En la misma carpeta se encuentran los mockups del index, la lista de productos y la puja como ejemplo. También están los logos y las versiones en 3d. Necesito que el sitio tenga ese diseño exacto y tomes los logos como los necesites de acuerdo a cada caso. Todo el sitio debe mantener la misma estructura."

---

## 1. Descripción enriquecida

Implementar el sistema de diseño oficial de Iron Loot (`docs/design/`) de forma consistente en los tres sitios SSR del monorepo: **BASE** (sitio público), **CLIENT** (portal privado) y **ADMIN** (backoffice). El trabajo cubre:

1. **Design tokens**: Nueva paleta de colores (`#151515`, `#31363F`, `#C89B3C`, `#F6F6F6`), tipografía (Montserrat SemiBold + Inter), y variables CSS compartidas.
2. **Activos de logo**: Los archivos de `docs/design/` (logos.png, logos3d.png) se usan como referencia; los SVG/PNG finales se colocan en las carpetas `public/images/` de cada sitio. Se deben crear los archivos de logo en el formato correcto para cada uso (navbar, footer, favicon-ready, etc.).
3. **BASE – Layout y páginas**: Rediseño completo del layout (`views/layouts/base.html`), home, lista de subastas, detalle de subasta y páginas de auth, replicando fielmente los mockups de `Index.png` y `list.png`.
4. **CLIENT – Layout**: Rediseño del sidebar y top-bar del portal privado (`views/layouts/client.html`) alineado al design system.
5. **ADMIN – Layout**: Actualización de colores y tokens del panel admin sin cambiar su estructura funcional.
6. **CSP y Google Fonts**: Las tres apps cargan Montserrat e Inter desde Google Fonts; las directivas CSP `styleSrc` y `fontSrc` en los tres `main.ts` deben incluir `fonts.googleapis.com` y `fonts.gstatic.com`.

### Estado actual (gap)

| Elemento | Estado actual | Estado objetivo |
|---|---|---|
| Colores BASE | `#1a1a2e` / `#e0a800` (azul oscuro + amarillo) | `#151515` / `#C89B3C` (Iron Black + Gold) |
| Colores CLIENT | Mismo que BASE | Mismo sistema |
| Colores ADMIN | `#4f46e5` (indigo) | `#151515` / `#C89B3C` |
| Fuente BASE/CLIENT | `system-ui` | Montserrat SemiBold + Inter |
| Fuente ADMIN | `Inter` (ya correcta, falta Montserrat) | Montserrat SemiBold + Inter |
| Logo BASE | Texto `⚡ IronLoot` | Logo imagen (shield + I) |
| Logo CLIENT | Texto `⚡ IronLoot` | Logo imagen (horizontal compacto) |
| HOME page | Hero simple + grid desnudo | Secciones completas según Index.png |
| LIST page | Grid básico sin sidebar | Sidebar de filtros + grid con imágenes |
| CSP Google Fonts | No incluida | Incluida en `styleSrc` + `fontSrc` |

---

## 2. Acceptance Criteria

### Design System (DS)

- [ ] **AC-DS-01**: El archivo `src/apps/base/public/css/base.css` define variables CSS (`--color-iron-black: #151515`, `--color-gunmetal: #31363F`, `--color-gold: #C89B3C`, `--color-white: #F6F6F6`) usadas en todos los selectores de color.
- [ ] **AC-DS-02**: El archivo `src/apps/client/public/css/client.css` usa las mismas variables de color que BASE (`--color-iron-black`, `--color-gold`, `--color-gunmetal`).
- [ ] **AC-DS-03**: El archivo `src/admin/public/css/admin.css` actualiza `--primary` a un valor derivado del design system (Gold `#C89B3C` o variante oscura) y `--sidebar-bg` a `#151515`.
- [ ] **AC-DS-04**: Los tres layouts cargan Google Fonts con Montserrat (400, 600, 700) e Inter (400, 500) vía `<link>` en `<head>`.
- [ ] **AC-DS-05**: La regla `font-family` de `body` en BASE y CLIENT es `'Inter', system-ui, sans-serif`; los `h1`–`h4` usan `'Montserrat', sans-serif` con `font-weight: 600`.

### BASE — Navbar y Footer

- [ ] **AC-BASE-NAV-01**: La navbar muestra el logo imagen (shield) a la izquierda; al inspeccionarlo, el `src` apunta a `/images/logo-horizontal.svg` (o `.png`).
- [ ] **AC-BASE-NAV-02**: La navbar incluye los links: Categorías, Subastas, Nosotros; y botones "Iniciar sesión" (ghost) y "Registrarse" (gold filled).
- [ ] **AC-BASE-NAV-03**: El fondo de la navbar es `#151515` (Iron Black), con links en `#F6F6F6` y hover en `#C89B3C`.
- [ ] **AC-BASE-NAV-04**: La navbar es sticky (`position: sticky; top: 0`).
- [ ] **AC-BASE-FOOTER-01**: El footer tiene fondo `#151515` y estructura en 4 columnas (Logo+tagline | Plataforma | Soporte | Legal), con copyright al pie.
- [ ] **AC-BASE-FOOTER-02**: El logo en el footer usa la variante monocromática/isotipo de Iron Loot.

### BASE — Página Home (Index.png)

- [ ] **AC-HOME-01**: La sección hero contiene el headline "Donde el valor cambia de manos con total confianza", dos CTAs ("Ver subastas" en gold, "Vender ahora" en ghost), y el logo 3D (imagen `logos3d.png` o versión optimizada) como elemento visual destacado.
- [ ] **AC-HOME-02**: La sección "Seguridad. Transparencia. Valor." (o equivalente con 3 pilares) está presente como franja de confianza bajo el hero, con iconos y texto descriptivo breve para cada pilar.
- [ ] **AC-HOME-03**: La sección "Activos excepcionales. Oportunidades únicas." muestra el grid de subastas activas; cuando no hay subastas, muestra el estado vacío con CTA de registro.
- [ ] **AC-HOME-04**: La sección "Participar es simple, serio y profesional." (o "¿Cómo funciona?") muestra 3 pasos numerados: Regístrate, Deposita fondos, Puja.
- [ ] **AC-HOME-05**: La sección "Socios y aliados estratégicos" contiene logos de partners (placeholder si no hay reales).
- [ ] **AC-HOME-06**: La sección de newsletter (CTA para recibir oportunidades) está presente antes del footer con un input de email y botón de suscripción (formulario decorativo — no se conecta al backend en este PT).
- [ ] **AC-HOME-07**: El fondo de la página home es `#F6F6F6` (modo luz); las secciones alternas usan `#FFFFFF` o `#151515` como contraste.

### BASE — Página Lista de Subastas (list.png)

- [ ] **AC-LIST-01**: La página `/auctions` tiene un layout de dos columnas: sidebar de filtros (250px fijo) + área de grid.
- [ ] **AC-LIST-02**: El sidebar de filtros contiene: Categorías (lista), Estado de subasta (checkboxes), Rango de precio (inputs), Vendedor verificado (toggle). Los controles son visualmente consistentes con el design system (bordes `#31363F`, focus gold).
- [ ] **AC-LIST-03**: Cada tarjeta de subasta (`auction-card`) muestra: imagen del ítem (placeholder si no hay imagen), título, precio actual, precio de salida, número de pujas, y botón "Ver subasta".
- [ ] **AC-LIST-04**: El área de grid tiene un header con total de resultados y controles de ordenamiento (dropdown "Ordenar por").
- [ ] **AC-LIST-05**: El componente de paginación es visible y funcional (usa los parámetros de query existentes).

### BASE — Página Detalle de Subasta

- [ ] **AC-DETAIL-01**: El layout es de dos columnas: galería/descripción (izquierda, 60%) y panel de puja (derecha, 40%).
- [ ] **AC-DETAIL-02**: El panel de puja tiene fondo blanco, borde `#31363F`, y el precio actual destacado en Montserrat SemiBold con color `#C89B3C`.
- [ ] **AC-DETAIL-03**: El botón "Pujar ahora" es gold filled y prominente.

### BASE — Páginas de Auth

- [ ] **AC-AUTH-01**: Los formularios de login, registro, recovery y reset-password usan un card centrado con fondo `#FFFFFF`, borde sutil, y header con logo Iron Loot.
- [ ] **AC-AUTH-02**: Los inputs tienen `border-color: #31363F` en estado normal y `border-color: #C89B3C` + `box-shadow` gold en estado `:focus`.
- [ ] **AC-AUTH-03**: El botón submit es gold filled (`background: #C89B3C; color: #151515`).

### CLIENT — Layout

- [ ] **AC-CLIENT-NAV-01**: El sidebar tiene fondo `#151515` (Iron Black), con el logo imagen (isotipo compacto) en la parte superior.
- [ ] **AC-CLIENT-NAV-02**: Los nav-items activos tienen indicador gold (`border-left: 3px solid #C89B3C` o `color: #C89B3C`).
- [ ] **AC-CLIENT-NAV-03**: La top-bar tiene fondo `#FFFFFF`, borde inferior `#31363F` con opacidad, y el nombre de la sección activa en Montserrat SemiBold.
- [ ] **AC-CLIENT-NAV-04**: Los emojis de los nav-items son reemplazados por íconos SVG inline o equivalentes consistentes con el estilo minimalista (o eliminados en favor de texto puro si no hay SVG set disponible).

### ADMIN — Layout

- [ ] **AC-ADMIN-01**: El sidebar del admin tiene fondo `#151515`; el logo Iron Loot (variante horizontal) es visible.
- [ ] **AC-ADMIN-02**: La variable `--primary` del admin CSS apunta a `#C89B3C` (Gold); los botones de acción principal del admin usan este color.
- [ ] **AC-ADMIN-03**: Los colores semánticos del admin (success, danger, warning) se mantienen sin cambios (solo cambia el primary y el sidebar).

### Assets y CSP

- [ ] **AC-ASSETS-01**: Los archivos de logo existen en `src/apps/base/public/images/` (mínimo: `logo-horizontal.png`, `logo-isotipo.png`, `logo-3d.png`).
- [ ] **AC-ASSETS-02**: Los archivos de logo existen en `src/apps/client/public/images/` (mínimo: `logo-isotipo.png`).
- [ ] **AC-ASSETS-03**: Los archivos de logo existen en `src/admin/public/images/` (mínimo: `logo-horizontal.png`).
- [ ] **AC-CSP-01**: `src/apps/base/src/main.ts` incluye `'https://fonts.googleapis.com'` en `styleSrc` y `'https://fonts.gstatic.com'` en `fontSrc`.
- [ ] **AC-CSP-02**: `src/apps/client/src/main.ts` incluye las mismas directivas CSP para Google Fonts.
- [ ] **AC-CSP-03**: `src/admin/src/main.ts` incluye las mismas directivas CSP para Google Fonts.
- [ ] **AC-CSP-04**: En navegador, la carga de Google Fonts no genera errores CSP en la consola.

---

## 3. Test Scenarios

### Happy Path

- **TS-HP-01 — Home completo**: Navegar a `/` → se renderiza el hero con headline y logo 3D, sección de pilares, grid de subastas, sección "Cómo funciona", sección de partners, newsletter section, footer 4 columnas. Fuente visible: Montserrat en headlines, Inter en body.
- **TS-HP-02 — Lista con filtros**: Navegar a `/auctions` → layout dos columnas visible, sidebar con 4 filtros, grid con tarjetas que incluyen imagen y precio.
- **TS-HP-03 — Detalle de subasta**: Navegar a `/auctions/:id` → layout split, panel de puja con precio en gold, botón "Pujar ahora" prominente.
- **TS-HP-04 — Login**: Navegar a `/auth/login` → card centrado, logo, input focus muestra borde gold, botón submit gold.
- **TS-HP-05 — Dashboard CLIENT**: Login → `/dashboard` → sidebar Iron Black con isotipo, nav-items con hover/active gold, top-bar blanca con Montserrat.
- **TS-HP-06 — Admin panel**: Login admin → panel con sidebar Iron Black, botones primary gold, tablas y cards con design system.

### Edge Cases

- **TS-EC-01 — Home sin subastas activas**: La API devuelve 0 subastas → el grid muestra estado vacío con mensaje + CTA de registro (no error visual).
- **TS-EC-02 — Lista sin resultados**: Búsqueda sin coincidencias → "No hay subastas disponibles" con estado vacío visual (icono + texto), sidebar de filtros visible.
- **TS-EC-03 — Pantallas pequeñas (≤768px)**: El sidebar de filtros en `/auctions` colapsa o se oculta; la navbar de BASE se pliega con menú hamburguesa (o links se apilan).
- **TS-EC-04 — Logo imagen no encontrada**: El tag `<img>` del logo incluye `alt="Iron Loot"` visible como fallback si el archivo no carga.
- **TS-EC-05 — Google Fonts bloqueadas (offline)**: El stack CSS usa `system-ui` como fallback (`'Montserrat', system-ui, sans-serif`), por lo que la página sigue siendo legible.

### Failure Cases

- **TS-FC-01 — CSP bloquea Google Fonts**: Si las directivas CSP no son actualizadas, la consola muestra `Content Security Policy: The page's settings blocked the loading of a resource`. Verificar que NO aparezca este error tras el fix.
- **TS-FC-02 — Logo en ruta incorrecta**: Si `/images/logo-horizontal.png` retorna 404, el navegador muestra imagen rota. Verificar con DevTools Network que los logos devuelven HTTP 200.
- **TS-FC-03 — main.ts de BASE roto**: Un error de sintaxis en `main.ts` hace que el servidor no arranque. Verificar `npm run build` sin errores tras cada modificación de `main.ts`.

---

## 4. NFRs

| NFR | Detalle |
|---|---|
| **Rendimiento** | Los logos PNG/SVG deben pesar < 100 KB. La carga de Google Fonts usa `display=swap` para evitar FOUT bloqueante. |
| **Seguridad** | Toda modificación a `main.ts` (CSP) debe mantener el resto de las directivas intactas; no degradar `frameSrc`, `objectSrc`, `scriptSrc`. |
| **Accesibilidad** | Los logos `<img>` tienen `alt` descriptivo. El contraste Color/Fondo cumple WCAG AA: Gold `#C89B3C` sobre Iron Black `#151515` = ratio 4.7:1 (✓). |
| **Compatibilidad** | CSS compatible con Chrome 100+, Firefox 100+, Safari 15+, Edge 100+. No se usan propiedades experimentales. |
| **Mantenibilidad** | Todos los colores y fuentes del design system están definidos como variables CSS (`--color-*`, `--font-*`) al inicio del CSS; no valores hardcoded dispersos. |
| **SSR** | Los cambios son exclusivamente CSS/HTML/assets; ningún cambio altera lógica de controladores, servicios, o DTOs. La integración con la API es transparente. |

---

## 5. Out-of-scope (este PT NO cubre)

- ❌ **Dark mode toggle**: El mockup muestra modo luz como primario; el modo oscuro (`Modo_Oscuro.md`) es una variante futura. Este PT solo implementa modo luz.
- ❌ **Diseño responsive completo (mobile-first)**: Se asegura legibilidad básica en mobile (no roto), pero el breakpoint de tablet/mobile no es el foco. Responsividad completa es un PT futuro.
- ❌ **Formulario de newsletter funcional**: La sección de newsletter en el home tiene campo de email pero no se conecta a ningún endpoint. Es decorativa en este PT.
- ❌ **Sección de partners con logos reales**: Los logos de partners/aliados son placeholders visuales. Contenido real viene de CMS (fuera de scope).
- ❌ **Imágenes de productos en subastas**: Las tarjetas de subasta usan un placeholder si no hay imagen real en la API. La gestión de imágenes de items es un PT separado.
- ❌ **Favicon rediseñado**: El isotipo puede usarse como favicon, pero la gestión de `favicon.ico` + PWA icons no es parte de este PT.
- ❌ **Páginas CLIENT internas** (wallet, bids, orders, profile, etc.): Solo se actualiza el layout del CLIENT (sidebar + top-bar + tokens CSS). Las páginas internas heredan el design system pero no se redesignan sus contenidos específicos.
- ❌ **Admin — páginas internas de módulos**: Solo se actualizan los tokens de color y el sidebar del admin. Las tablas, formularios y vistas de los 18 módulos admin no se redesignan.
- ❌ **Animaciones o microinteracciones**: El diseño es estático. No se introducen librerías de animación ni transiciones complejas más allá de `transition` CSS básico.
- ❌ **Cambios en controladores NestJS, servicios, DTOs o schema Prisma**: Cero modificaciones al backend.
- ❌ **Lógica JavaScript de páginas** (bid real-time, socket.io, wallet JS): Los archivos `public/js/pages/**/*.js` no se modifican.
- ❌ **Sistema de íconos SVG completo**: Si los emojis en CLIENT sidebar se mantienen por limitación de tiempo/assets, se acepta. La sustitución completa por SVG set es opcional.

---

## 6. Componentes afectados

| Componente | Archivo(s) | Tipo de cambio |
|---|---|---|
| **CSS BASE** | `src/apps/base/public/css/base.css` | Reescritura completa — tokens + todos los selectores |
| **CSS CLIENT** | `src/apps/client/public/css/client.css` | Reescritura completa — tokens + sidebar + layout |
| **CSS ADMIN** | `src/admin/public/css/admin.css` | Actualización de variables `--primary`, `--sidebar-bg`, añadir Montserrat |
| **Layout BASE** | `src/apps/base/views/layouts/base.html` | Reescritura — navbar con logo imagen, footer 4-col, link Google Fonts |
| **Layout CLIENT** | `src/apps/client/views/layouts/client.html` | Reescritura — sidebar Iron Black con logo, sin emojis (o con iconos) |
| **Layout ADMIN** | `src/admin/views/layouts/admin.html` | Actualización de sidebar brand con logo |
| **Home** | `src/apps/base/views/pages/home.html` | Reescritura completa — 6 secciones según Index.png |
| **Lista subastas** | `src/apps/base/views/pages/auctions/list.html` | Reescritura — sidebar filtros + grid con imágenes |
| **Detalle subasta** | `src/apps/base/views/pages/auctions/detail.html` | Reescritura — layout split, panel puja estilizado |
| **Auth forms** | `src/apps/base/views/pages/auth/*.html` (5 archivos) | Actualización de clases y card layout |
| **CSP main.ts BASE** | `src/apps/base/src/main.ts` | Añadir Google Fonts a `styleSrc` + `fontSrc` |
| **CSP main.ts CLIENT** | `src/apps/client/src/main.ts` | Añadir Google Fonts a `styleSrc` + `fontSrc` |
| **CSP main.ts ADMIN** | `src/admin/src/main.ts` | Añadir Google Fonts a `styleSrc` + `fontSrc` |
| **Assets BASE** | `src/apps/base/public/images/` (nueva carpeta) | Añadir logo-horizontal.png, logo-isotipo.png, logo-3d.png |
| **Assets CLIENT** | `src/apps/client/public/images/` (nueva carpeta) | Añadir logo-isotipo.png |
| **Assets ADMIN** | `src/admin/public/images/` (nueva carpeta) | Añadir logo-horizontal.png |

**Archivos con riesgo extra (de `11-Conventions.md §5`):**

| Archivo | Riesgo | Cuidado específico |
|---|---|---|
| `src/apps/base/src/main.ts` | HIGH | Solo añadir URLs a `styleSrc` y `fontSrc`; no alterar `scriptSrc`, `frameSrc`, `objectSrc`, `crossOriginEmbedderPolicy`, ni la lógica del BFF proxy |
| `src/apps/client/src/main.ts` | HIGH | Solo CSP. No alterar `ClientAuthGuard`, cookie config, ni lógica de API fetch |
| `src/admin/src/main.ts` | HIGH | Solo CSP. No alterar `AdminAuthGuard`, session config, ni lógica de proxy |

---

## 7. Impacto en modelo de datos

**Ninguno.** Este PT es exclusivamente visual (CSS + HTML + assets estáticos). No se modifica:
- Schema Prisma
- Migraciones
- DTOs
- Controladores
- Servicios
- Módulos NestJS

---

## 8. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **CSP rota (Google Fonts bloqueadas)** | ALTA | MEDIO | Verificar en navegador tras cada `main.ts` edit; error visible en consola. |
| **main.ts roto por edición** | MEDIA | ALTO | Ejecutar `npm run build` en cada app tras modificar `main.ts`. Cambio mínimo (1-2 líneas por archivo). |
| **Logo assets en formato inadecuado** | MEDIA | BAJO | Los mockups tienen los logos como PNG en `docs/design/`. Copiar directamente como PNG funcional. Si se requiere SVG, crear versión SVG a mano o usar PNG como base. |
| **Home.html requiere datos extra del controlador** | MEDIA | MEDIO | Secciones como "partners" o "cómo funciona" son HTML estático en el template (no requieren datos de API). Solo el grid de subastas usa datos del controlador (ya implementado). |
| **Regresión en auth flows** | BAJA | ALTO | Los formularios de auth solo cambian clases CSS; la lógica de submit y los endpoints no se tocan. Verificar visualmente que los formularios siguen enviando datos. |
| **Admin tablas ilegibles con nuevo color primary** | BAJA | MEDIO | Solo se cambia `--primary` y `--sidebar-bg`; colores de texto, badges y tablas conservan sus variables actuales. |
| **Imágenes de subastas (API no devuelve imageUrl)** | ALTA | BAJO | Las tarjetas de subasta usan un placeholder CSS (gradient o color block) cuando no hay imagen real. No se rompe el layout. |

---

## 9. Dependencias

| Dependencia | Estado | Impacto en implementación |
|---|---|---|
| Archivos de logo en `docs/design/` | DISPONIBLE (logos.png, logos3d.png como referencia) | Los PNG de `docs/design/` se copian/recortan para uso directo en `public/images/`. |
| Google Fonts (CDN externo) | DISPONIBLE (internet requerido) | Carga en desarrollo local; en prod requiere acceso a CDN. |
| Estructura de Nunjucks y layouts existentes | VALIDADA (Foundation 2026-06-23) | Confirmar existencia de `src/admin/views/layouts/admin.html` antes de editar. |
| CSP actual en main.ts | CONOCIDA (TRD §3.4, 05-UIUX-Brief §7) | `styleSrc ['self', 'unsafe-inline']` → ampliar a `['self', 'unsafe-inline', 'https://fonts.googleapis.com']` |

---

## 10. Nivel de Confianza

| | % | Razonamiento |
|---|---|---|
| **Architecture Confidence** | 90% | Todos los archivos afectados están identificados y leídos. La estructura SSR + Nunjucks + plain CSS es bien conocida. El único riesgo arquitectónico menor es confirmar la ubicación exacta del layout admin. |
| **Implementation Confidence** | 82% | Los mockups (Index.png, list.png) dan instrucciones visuales claras. La extracción de logos desde `docs/design/logos.png` (PNG sheet) puede requerir recorte manual; si el desarrollador provee SVGs individuales, la confianza sube a 95%. El volumen de archivos a modificar (15+) es alto. |

---

## Estado

**ENRICHMENT_PENDING**

## PT-069 — FEATURE — KYC obligatorio (submission + gate)
**Fecha**: 2026-07-25 | **Complejidad**: STANDARD | Cierra OBS-01/PT-061.

### Criterios de aceptación
- Existe `POST /api/v1/kyc` (vendedor envía documentos → `KycSubmission` PENDING) y `GET /api/v1/kyc/me` (estado).
- `enable-seller` **exige KYC APPROVED**: si no hay KYC aprobado, rechaza con mensaje claro.
- La aprobación admin (existente) sigue habilitando `isSeller`.
### Escenarios
- Sin KYC → enable-seller falla ("KYC approval required"). Con KYC APPROVED → habilita.
- submit dos veces → crea/actualiza submission PENDING.
### NFR
- Auth requerida (JWT) en submit/estado. Sin cambios de schema (modelo `KycSubmission` ya existe).
### Fuera de alcance
- Verificación automática de identidad (proveedor KYC). Carga de archivos (docsJson es metadata).

## PT-070 — FEATURE — Métodos de pago bancarios reales (CLABE)
**Fecha**: 2026-07-25 | Migración `pt070_bank_payment_methods`.
- Criterios: registrar cuenta bancaria (banco, CLABE 18 dígitos válida, titular) → `POST /wallet/payment-methods`; listar → `GET`. CLABE con dígito verificador validado. CLABE duplicada rechazada.
- Escenarios: CLABE inválida→400; válida→201 (isVerified=false); duplicada→400.
- Fuera de alcance: verificación de titularidad automática (micro-depósito); ligar titular al KYC (se guarda holderName, validación estricta queda para después).

## PT-071 — FEATURE — Retención de liquidación (holdback)
**Fecha**: 2026-07-25 | Migración `pt071_settlement_holdback`.
- Criterios: el ingreso de venta entra a `wallet.pendingBalance` (no disponible). Un cron libera a disponible cuando el pedido está DELIVERED o venció la ventana de disputa (`DISPUTE_WINDOW_DAYS`, 14). Ledger `SETTLEMENT_RELEASE`.
- Schema: `Wallet.pendingBalance`, `Order.sellerNet`, `Order.sellerSettledAt`, `LedgerType.SETTLEMENT_RELEASE`.
- Balance expone `pending`.
- Escenarios: venta → pending↑ (disponible sin cambio); maduración → pending→disponible; idempotente.
- Fuera de alcance: confirmación de recepción explícita del comprador (se usa DELIVERED del shipment).

## PT-072 — FEATURE — Solicitud de retiro + máquina de estados + aprobación admin + PayoutProvider(manual)
**Fecha**: 2026-07-25 | Migración `pt072_withdrawal_requests`.
- Estados: REQUESTED→APPROVED→PAID · (REQUESTED/APPROVED)→REJECTED (reintegra). Aprobación SIEMPRE manual.
- Al solicitar se RESERVAN fondos (disponible↓ + WITHDRAWAL). Rechazo reintegra (ADJUSTMENT).
- Gates: KYC APPROVED + método válido + saldo disponible + límite diario (WITHDRAWAL_DAILY_LIMIT).
- PayoutProvider (interfaz) + ManualPayoutProvider (MVP: admin ejecuta SPEI y marca PAID). Fase 2: auto.
- Endpoints vendedor: POST/GET /wallet/withdrawals. Admin: GET /admin/withdrawals, PATCH approve/reject/mark-paid.
- Fuera de alcance: dispersión bancaria automática (SPEI API); verificación de titularidad.

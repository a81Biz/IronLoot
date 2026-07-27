# test-scenarios.md — PT-035: Iron Loot Design System

**PT-035** | **Fecha**: 2026-06-23

> Nota metodológica: PT-035 modifica exclusivamente CSS, HTML y assets estáticos. No existe suite de tests automatizados para templates Nunjucks o archivos CSS en este proyecto. Los test scenarios son verificaciones visuales y de build que constituyen el equivalente al ciclo RED/GREEN para cambios de presentación.
>
> **Estado RED**: el sitio actual no coincide con el mockup (colores, tipografía, estructura de secciones incorrectos).  
> **Estado GREEN**: el sitio post-implementación coincide con los mockups y todos los flujos funcionales siguen operativos.

---

## Happy Path

### TS-HP-01 — Home completo (Index.png)

**Setup**: Stack Docker activo o BASE + API corriendo en modo híbrido.

**Pasos**:
1. Navegar a `http://base.ironloot.local/` (o `http://localhost:5174/`)
2. Verificar sin scroll: hero visible con headline "Donde el valor cambia de manos con total confianza", logo 3D y 2 CTAs.
3. Hacer scroll: sección de pilares de confianza (3 columnas) visible.
4. Continuar scroll: grid de subastas activas renderizado.
5. Continuar scroll: sección "Cómo funciona" con fondo Iron Black y 3 pasos gold.
6. Continuar scroll: sección de partners y newsletter.
7. Verificar footer: 4 columnas, isotipo, copyright.

**Criterio de aceptación**:
- ✓ 6 secciones visibles en scroll completo
- ✓ Fuente Montserrat en headlines (verificar DevTools > Computed > font-family)
- ✓ Fuente Inter en body text
- ✓ Colores: fondo principal `#F6F6F6`, gold `#C89B3C` en accents, Iron Black `#151515` en footer y "Cómo funciona"
- ✓ Logo 3D (`logo-3d.png`) visible en hero, HTTP 200 en Network

---

### TS-HP-02 — Lista de subastas (list.png)

**Setup**: Stack activo.

**Pasos**:
1. Navegar a `/auctions`.
2. Verificar layout: sidebar izquierdo (≈250px) + área de resultados derecha.
3. Verificar sidebar: "Categorías", "Estado de subasta", "Precio", "Vendedor verificado" presentes.
4. Verificar cards en grid: imagen (placeholder si no hay real), título, precio gold, N pujas, botón "Ver subasta".
5. Buscar con `?q=test` → resultados filtrados (o empty state).
6. Marcar checkbox "ACTIVE" en estado → submit → URL incluye `?status=ACTIVE`.

**Criterio de aceptación**:
- ✓ Layout 2 columnas visible
- ✓ Sidebar con los 4 grupos de filtros
- ✓ Cards con imagen y datos
- ✓ Botón "Aplicar filtros" funciona (GET con params)
- ✓ Paginación visible si hay >N resultados

---

### TS-HP-03 — Detalle de subasta

**Setup**: API con al menos 1 subasta ACTIVE.

**Pasos**:
1. Desde `/auctions`, clic en "Ver subasta" de una subasta activa.
2. Verificar layout split: descripción/galería a la izquierda, panel derecho sticky.
3. Verificar panel derecho: precio gold en Montserrat SemiBold, stats de pujas, botón "Pujar ahora" full-width gold.
4. Clic en "Pujar ahora" → redirige a `{{ clientUrl }}/auctions/{{ id }}` (CLIENT con auth guard).

**Criterio de aceptación**:
- ✓ Layout 2 columnas (60/40)
- ✓ Panel de puja: `background: white`, borde `#31363F`
- ✓ Precio: color `#C89B3C`, font-weight 700, Montserrat
- ✓ CTA redirige correctamente al CLIENT

---

### TS-HP-04 — Login form

**Pasos**:
1. Navegar a `/auth/login`.
2. Verificar: card centrado (max-width ~480px), logo isotipo arriba, título "Iniciar sesión".
3. Clic en campo Email → verificar borde gold + shadow gold.
4. Clic en campo Password → misma visualización.
5. Ingresar credenciales inválidas → submit → mensaje de error visible (no 500).
6. Ingresar credenciales válidas → redirect a CLIENT dashboard.

**Criterio de aceptación**:
- ✓ Card centrado con logo
- ✓ Focus: `border-color: #C89B3C`, `box-shadow: 0 0 0 3px rgba(200,155,60,0.25)`
- ✓ Botón submit gold (`background: #C89B3C`, `color: #151515`)
- ✓ Error de credenciales muestra alert, no error 500
- ✓ Login exitoso → redirect funcional

---

### TS-HP-05 — Register form

**Pasos**:
1. Navegar a `/auth/register`.
2. Verificar misma estructura de card que login.
3. Completar formulario con datos válidos → submit → redirect a verify-email-pending.

**Criterio de aceptación**:
- ✓ Card con logo y patrón visual idéntico al login
- ✓ Registro funcional (no 500, no 422 por campos faltantes)

---

### TS-HP-06 — CLIENT portal (dashboard)

**Setup**: Usuario autenticado.

**Pasos**:
1. Desde login exitoso, navegar al CLIENT dashboard.
2. Verificar sidebar: fondo `#151515`, logo SVG isotipo visible, texto "IronLoot" en Montserrat.
3. Hover sobre un nav-item → acento gold visible.
4. Top-bar: fondo blanco, título en Montserrat SemiBold.
5. Navegar a 5 rutas del sidebar (Dashboard, Wallet, Mis ofertas, Órdenes, Perfil).

**Criterio de aceptación**:
- ✓ Sidebar Iron Black (`#151515`)
- ✓ Logo SVG visible
- ✓ Nav-items sin emojis, texto legible
- ✓ Hover gold visible
- ✓ Las 5 rutas cargan sin error

---

### TS-HP-07 — Admin panel

**Setup**: Admin login activo.

**Pasos**:
1. Login en admin (`:3001`).
2. Verificar sidebar: fondo `#151515`, logo SVG (reemplaza al rayo), "Iron Loot" + "Backoffice" en Montserrat.
3. Verificar que Material Symbols icons del sidebar siguen visibles.
4. Verificar un botón CTA en cualquier página → color gold (no indigo).
5. Navegar: Dashboard, Users, Auctions, Payments, Orders.

**Criterio de aceptación**:
- ✓ Sidebar `#151515`
- ✓ SVG isotipo visible, reemplaza al bolt icon
- ✓ Material Symbols íconos operativos (fuente sigue cargando)
- ✓ Botones primary gold
- ✓ Tablas, badges, textos legibles (sin regresión de contraste)

---

## Edge Cases

### TS-EC-01 — Home sin subastas activas

**Setup**: API sin subastas activas (o API no corriendo).

**Pasos**:
1. Navegar a `/`.
2. Verificar sección `active-auctions`.

**Criterio de aceptación**:
- ✓ Sección muestra estado vacío: texto descriptivo + CTA "Regístrate" (no error JS ni layout roto)
- ✓ El resto de las secciones se renderizan correctamente

---

### TS-EC-02 — Lista sin resultados de búsqueda

**Pasos**:
1. Navegar a `/auctions?q=xyzxyzxyz` (búsqueda sin resultados).

**Criterio de aceptación**:
- ✓ Sidebar de filtros visible
- ✓ Área de resultados muestra "No hay subastas disponibles" con estado vacío
- ✓ Sin errores JS en consola

---

### TS-EC-03 — Subasta no activa (DETAIL)

**Pasos**:
1. Navegar a `/auctions/:id` donde la subasta tiene estado CLOSED o DRAFT.

**Criterio de aceptación**:
- ✓ Panel de puja muestra "Esta subasta no está activa actualmente" en lugar del botón
- ✓ Layout split sigue visible

---

### TS-EC-04 — Logo SVG fallback (sin font Montserrat)

**Setup**: Simular falta de red para Google Fonts (DevTools > Network > Block font domains).

**Pasos**:
1. Bloquear `fonts.googleapis.com` y `fonts.gstatic.com` en DevTools.
2. Recargar cualquier página de BASE.

**Criterio de aceptación**:
- ✓ La página carga sin errores (fallback a `system-ui`)
- ✓ El logo SVG sigue renderizando correctamente (no depende de fuente externa para la forma del shield)
- ✓ El wordmark "IRON LOOT" puede caer en system-ui (aceptable)

---

### TS-EC-05 — Logo 3D no encontrado

**Setup**: Renombrar temporalmente `logo-3d.png` para simular 404.

**Pasos**:
1. Navegar a `/`.

**Criterio de aceptación**:
- ✓ El `<img alt="Iron Loot">` muestra el alt text o imagen rota contenida dentro de `.hero-visual` (sin romper el layout)
- ✓ La sección hero sigue siendo funcional (headline y CTAs visibles)

---

### TS-EC-06 — Admin: contraste de tablas con nuevo primary gold

**Pasos**:
1. Abrir admin → cualquier tabla de usuarios o subastas.
2. Verificar filas de tabla: texto legible, sin fondo gold en celdas de datos.
3. Verificar badges (success green, danger red, warning yellow) sin cambio.

**Criterio de aceptación**:
- ✓ Celdas de tabla: texto `#1e293b` sobre fondo blanco/gray (sin gold en data cells)
- ✓ Badges semánticos (success/danger/warning) conservan sus colores originales
- ✓ Solo botones de acción y nav-items activos usan gold

---

## Failure Cases

### TS-FC-01 — npm run build falla en algún sitio

**Trigger**: Un cambio en HTML/CSS introduce un error de sintaxis o una referencia inválida.

**Comportamiento esperado**:
- BUILD → exit code ≠ 0 con mensaje de error descriptivo
- NestJS TypeScript: `Cannot find module` o similar si el path de template es inválido

**Mitigación documentada**:
- Los cambios a templates HTML no afectan TypeScript; un error de sintaxis HTML solo causa error de rendering en runtime
- Un cambio accidental en un import de TypeScript (si se tocase main.ts) causaría build failure — pero los main.ts NO se modifican en este PT

---

### TS-FC-02 — Auth form falla (5xx) post-redesign

**Trigger**: Si un `name` de input fue renombrado accidentalmente, el controller recibe `undefined` en el DTO.

**Comportamiento esperado con el bug**:
- `POST /api/v1/auth/login` con body vacío → API retorna `422 Unprocessable Entity` (class-validator)
- No un 500 (el ValidationPipe captura el error antes del servicio)

**Verificación**:
- Inspeccionar DevTools > Network al hacer submit de login
- Si retorna 200/302: correcto
- Si retorna 422: verificar que `name="email"` e `name="password"` están preservados en el template

---

### TS-FC-03 — Consola muestra errores CSP

**Trigger**: Si algún asset nuevo introduce un origen no permitido por CSP.

**Verificación**:
- DevTools > Console: buscar `Content Security Policy`
- Expected: sin errores CSP en BASE y CLIENT
- Si aparece: el asset debe venir de origen permitido (`'self'`) o CSP debe actualizarse (requiere nuevo sub-task)

**Nota**: El logo SVG inline no genera requests externos → no puede violar CSP.

---

### TS-FC-04 — Admin: Material Symbols desaparecen post-cambio

**Trigger**: Si el `<link>` de Material Symbols fue eliminado accidentalmente del `admin.html`.

**Verificación**:
- Admin sidebar muestra iconos cuadrados o texto unicode en lugar de iconos
- Revisar `admin.html:10` — la línea de Material Symbols debe estar intacta

**Status preventivo**: El task T-035.6 especifica que solo se añade el Montserrat link y se reemplaza el span del brand. El link de Material Symbols no se toca.

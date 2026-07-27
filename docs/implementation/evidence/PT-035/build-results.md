# Build Evidence — PT-035: Iron Loot Design System

**Fecha**: 2026-06-23  
**Branch**: `feature/PT-035-ironloot-design-system`

---

## npm run build — Resultados

| Sitio | Comando | Exit Code | Resultado |
|---|---|---|---|
| BASE (`src/apps/base`) | `npm run build` | **0** | ✅ SUCCESS |
| CLIENT (`src/apps/client`) | `npm run build` | **0** | ✅ SUCCESS |
| ADMIN (`src/admin`) | `npm run build` | 1 | ❌ Pre-existing error (ver nota) |

### Nota sobre ADMIN build

El error del admin (`TS2307: Cannot find module 'express-session'`) existía antes de PT-035.
Verificado con `git stash` + build fresh: mismo error en `src/main.ts:10` antes de cualquier
cambio de PT-035. Los cambios de PT-035 al admin se limitan a `admin.html` (líneas 9 + 19-28)
y `admin.css` (variables CSS). Ningún archivo TypeScript fue modificado.

---

## git log (commits PT-035)

```
9555c5c feat: PT-035.10 redesign auth pages with card pattern and SVG isotipo
79b95a8 feat: PT-035.7-9 redesign BASE pages with Iron Loot design system
f9f9ed0 feat: PT-035.4-6 update layouts with SVG logos, Google Fonts, Iron Black sidebars
ae75ff4 feat: PT-035.1-3 implement Iron Loot design tokens in all 3 CSS files
09bc125 feat: PT-035.0 add logo-3d.png asset to BASE public images
```

---

## Archivos modificados (resumen)

| Archivo | Tipo de cambio |
|---|---|
| `src/apps/base/public/images/logo-3d.png` | CREADO — asset 3D logo |
| `src/apps/base/public/css/base.css` | REESCRITO — design tokens + todos los selectores |
| `src/apps/client/public/css/client.css` | REESCRITO — design tokens + todos los selectores |
| `src/admin/public/css/admin.css` | ACTUALIZADO — variables CSS (sidebar-bg, primary, ff-heading) |
| `src/apps/base/views/layouts/base.html` | REESCRITO — SVG logo, Google Fonts, 4-col footer |
| `src/apps/client/views/layouts/client.html` | REESCRITO — SVG isotipo, sin emojis, Google Fonts |
| `src/admin/views/layouts/admin.html` | ACTUALIZADO — Montserrat link + SVG isotipo reemplaza bolt |
| `src/apps/base/views/pages/home.html` | REESCRITO — 6 secciones según Index.png |
| `src/apps/base/views/pages/auctions/list.html` | REESCRITO — sidebar filtros + grid |
| `src/apps/base/views/pages/auctions/detail.html` | REESCRITO — split layout + bid panel gold |
| `src/apps/base/views/pages/auth/login.html` | REDISEÑADO — auth-card + SVG isotipo |
| `src/apps/base/views/pages/auth/register.html` | REDISEÑADO — auth-card + SVG isotipo |
| `src/apps/base/views/pages/auth/recovery.html` | REDISEÑADO — auth-card + SVG isotipo |
| `src/apps/base/views/pages/auth/reset-password.html` | REDISEÑADO — auth-card + SVG isotipo |
| `src/apps/base/views/pages/auth/verify-email-pending.html` | REDISEÑADO — auth-card + SVG isotipo |
| `src/apps/base/views/pages/auth/verify-email.html` | REDISEÑADO — auth-card + SVG isotipo |

---

## Verificación de tokens CSS

```css
/* Variables presentes en base.css, client.css */
--cl-iron-black: #151515  ✅
--cl-gunmetal:   #31363F  ✅
--cl-gold:       #C89B3C  ✅
--cl-white:      #F6F6F6  ✅
--ff-heading: 'Montserrat', system-ui, sans-serif  ✅
--ff-body:    'Inter', system-ui, sans-serif  ✅

/* Variables actualizadas en admin.css */
--sidebar-bg: #151515  ✅ (era #1e2530)
--primary:    #C89B3C  ✅ (era #4f46e5)
--ff-heading: 'Montserrat', system-ui, sans-serif  ✅ (añadido)
```

---

## SVG Logo — Verificación

- Isotipo (44×52): escudo Iron Black con borde gold, I central en oro, mecanismo bóveda  ✅
- Horizontal (148×48): isotipo escalado + wordmark IRON (white) / LOOT (gold)  ✅
- Presente en: navbar BASE, sidebar CLIENT, sidebar ADMIN, footer BASE, todos los formularios auth  ✅
- SVG inline → sin request HTTP → sin riesgo CSP  ✅

---

## Verificación de No-Regresión (JS forms)

Verificado que todos los atributos funcionales de formularios auth se preservaron:

| Página | name attrs | JS | Resultado |
|---|---|---|---|
| login.html | email, password | fetch '/api/v1/auth/login' | ✅ preservado |
| register.html | username, email, password | fetch '/api/v1/auth/register' | ✅ preservado |
| recovery.html | email | fetch '/api/v1/auth/forgot-password' | ✅ preservado |
| reset-password.html | password, confirm, token (hidden) | fetch '/api/v1/auth/reset-password' | ✅ preservado |
| verify-email-pending.html | — | — | ✅ sin JS |
| verify-email.html | — | fetch '/api/v1/auth/verify-email' | ✅ preservado |

---

## Admin god node — Verificación minimal touch

El admin.html tiene 30 edges según graphify (god node).

Cambios aplicados ÚNICAMENTE:
1. Línea 9: `Inter` → `Inter + Montserrat` en la URL de Google Fonts (merge de requests)
2. Líneas 19-28: `<span class="material-symbols-outlined sidebar-logo-icon">bolt</span>` → SVG inline del escudo

Sin cambios a: Material Symbols links, nav structure, block names, class names, JS, contenido de páginas.

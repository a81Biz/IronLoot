# design.md — PT-035: Iron Loot Design System

**PT-035** | **Tipo**: FEATURE | **Complejidad**: MAJOR  
**Fecha**: 2026-06-23 | **Estrategia origen**: `docs/implementation/PLAN_ACTUAL.md`

---

## 1. Decisión de arquitectura: SVG inline sobre archivos de imagen

### Decisión
Los logos de Iron Loot se implementan como **SVG inline** en los templates HTML y como archivos `.svg` en `public/images/`. No se usan archivos PNG recortados de las hojas de presentación de `docs/design/`.

### Justificación
- `docs/design/logos.png` es una hoja de presentación compuesta (múltiples variantes en un solo canvas) — no extraíble limpiamente como PNG individual sin pérdida de calidad.
- SVG inline es escalable (retina-ready), modificable vía CSS, sin solicitudes HTTP adicionales en el crítico path de render.
- La especificación visual del brief (`docs/design/Modo_Oscuro.md`) es suficientemente precisa para reproducir el logo en SVG: "escudo cuadrado, letra I central, apertura inferior simulando una bóveda".
- El estilo descrito ("minimalista, monolineal, geométrico") es nativo de SVG.

### Excepción: hero 3D
`docs/design/logos3d.png` se copia directamente a `src/apps/base/public/images/logo-3d.png` porque es un render 3D (no reproducible en SVG 2D) y aparece solo en el hero del home.

---

## 2. Especificación SVG: Sistema de logos Iron Loot

### 2.1 Concepto geométrico

```
┌─────────────────────────────┐
│  Escudo cuadrado con vértice│
│  inferior redondeado        │
│                             │
│  ┌──────────┐  ← barra sup  │
│  │    I     │  ← fuste      │
│  └──────────┘  ← barra inf  │
│       ◎        ← dial bóveda│
└─────────────────────────────┘
```

Colores:
- Fondo escudo: `#151515` (Iron Black)
- Borde/detalles: `#C89B3C` (Gold)
- Letra I: `#C89B3C` (Gold) construida con rectángulos geométricos (sin dependencia de font)
- Dial bóveda: stroke `#C89B3C` con marcas de posición

Dimensiones canónicas del isotipo:
- ViewBox: `0 0 44 52`
- Proporción: 0.846 (ancho:alto) — armónica con el shield real

### 2.2 SVG ISOTIPO (variante base — fondo oscuro)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 52" aria-label="Iron Loot">
  <!-- Shield body -->
  <path d="M3,3 L41,3 L41,31 Q41,49 22,51 Q3,49 3,31 Z"
        fill="#151515" stroke="#C89B3C" stroke-width="2" stroke-linejoin="round"/>
  <!-- Letter I: barra superior -->
  <rect x="11" y="13" width="22" height="3.5" rx="1" fill="#C89B3C"/>
  <!-- Letter I: fuste vertical -->
  <rect x="19" y="13" width="6" height="20" rx="1" fill="#C89B3C"/>
  <!-- Letter I: barra inferior -->
  <rect x="11" y="29.5" width="22" height="3.5" rx="1" fill="#C89B3C"/>
  <!-- Vault dial -->
  <circle cx="22" cy="42" r="5.5" fill="none" stroke="#C89B3C" stroke-width="1.5"/>
  <!-- Dial markers (12, 3, 9 o'clock) -->
  <line x1="22" y1="36.8" x2="22" y2="38.2" stroke="#C89B3C" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="27.2" y1="42" x2="25.8" y2="42" stroke="#C89B3C" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="16.8" y1="42" x2="18.2" y2="42" stroke="#C89B3C" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Dial center pin -->
  <circle cx="22" cy="42" r="1.5" fill="#C89B3C"/>
</svg>
```

### 2.3 SVG HORIZONTAL (navbar BASE — fondo oscuro `#151515`)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 48" aria-label="Iron Loot">
  <!-- Shield (scaled to 40px height) -->
  <g transform="translate(0, 4) scale(0.769)">
    <path d="M3,3 L41,3 L41,31 Q41,49 22,51 Q3,49 3,31 Z"
          fill="#151515" stroke="#C89B3C" stroke-width="2" stroke-linejoin="round"/>
    <rect x="11" y="13" width="22" height="3.5" rx="1" fill="#C89B3C"/>
    <rect x="19" y="13" width="6" height="20" rx="1" fill="#C89B3C"/>
    <rect x="11" y="29.5" width="22" height="3.5" rx="1" fill="#C89B3C"/>
    <circle cx="22" cy="42" r="5.5" fill="none" stroke="#C89B3C" stroke-width="1.5"/>
    <line x1="22" y1="36.8" x2="22" y2="38.2" stroke="#C89B3C" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="27.2" y1="42" x2="25.8" y2="42" stroke="#C89B3C" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="16.8" y1="42" x2="18.2" y2="42" stroke="#C89B3C" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="22" cy="42" r="1.5" fill="#C89B3C"/>
  </g>
  <!-- Wordmark -->
  <text x="46" y="19"
        font-family="'Montserrat', system-ui, sans-serif"
        font-weight="700" font-size="15" letter-spacing="2"
        fill="#F6F6F6">IRON</text>
  <text x="46" y="36"
        font-family="'Montserrat', system-ui, sans-serif"
        font-weight="600" font-size="13" letter-spacing="2.5"
        fill="#C89B3C">LOOT</text>
</svg>
```

### 2.4 SVG ISOTIPO BLANCO (variante light — para uso en fondos blancos/claros)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 52" aria-label="Iron Loot">
  <path d="M3,3 L41,3 L41,31 Q41,49 22,51 Q3,49 3,31 Z"
        fill="#151515" stroke="#C89B3C" stroke-width="2" stroke-linejoin="round"/>
  <rect x="11" y="13" width="22" height="3.5" rx="1" fill="#C89B3C"/>
  <rect x="19" y="13" width="6" height="20" rx="1" fill="#C89B3C"/>
  <rect x="11" y="29.5" width="22" height="3.5" rx="1" fill="#C89B3C"/>
  <circle cx="22" cy="42" r="5.5" fill="none" stroke="#C89B3C" stroke-width="1.5"/>
  <line x1="22" y1="36.8" x2="22" y2="38.2" stroke="#C89B3C" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="27.2" y1="42" x2="25.8" y2="42" stroke="#C89B3C" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="16.8" y1="42" x2="18.2" y2="42" stroke="#C89B3C" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="22" cy="42" r="1.5" fill="#C89B3C"/>
</svg>
```

> Nota: el isotipo es idéntico en fondo oscuro y claro porque el path `fill="#151515"` actúa como fondo del escudo en ambos contextos; el fondo de la página no penetra el shield.

---

## 3. Design tokens CSS — convención de nombres

Prefijo `--cl-` (color) y `--ff-` (font-family) garantizan que no colisionen con variables externas (Bootstrap, Admin UI, etc.).

```css
:root {
  --cl-iron-black: #151515;
  --cl-gunmetal:   #31363F;
  --cl-gold:       #C89B3C;
  --cl-gold-dark:  #a8832e;
  --cl-white:      #F6F6F6;
  --cl-surface:    #FFFFFF;
  --cl-text-muted: #6B7280;
  --cl-border:     rgba(49, 54, 63, 0.2);

  --ff-heading: 'Montserrat', system-ui, sans-serif;
  --ff-body:    'Inter', system-ui, sans-serif;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;

  --shadow-card: 0 4px 20px rgba(0, 0, 0, 0.08);
  --shadow-md:   0 8px 30px rgba(0, 0, 0, 0.14);
  --shadow-gold: 0 0 0 3px rgba(200, 155, 60, 0.25);
}
```

El admin mantiene sus variables propias (`--primary`, `--sidebar-bg`, etc.) pero se actualizan sus valores a los tokens Iron Loot.

---

## 4. Estructura HTML del HOME (6 secciones)

```
<body>
  <header.site-header>  ← en base.html (layout)
    <nav.nav-container>
      <a.nav-brand>      ← SVG horizontal inline
      <div.nav-links>    ← Subastas | Categorías | Nosotros
      <div.nav-auth>     ← btn-ghost + btn-primary

  <main.main-content>   ← en base.html (layout)
    <section.hero>
      <div.hero-content>
        <span.hero-eyebrow>   Plataforma de subastas premium
        <h1.hero-headline>    "Donde el valor cambia de manos con total confianza."
        <p.hero-sub>
        <div.hero-actions>    btn-primary + btn-ghost
      <div.hero-visual>
        <img src="/images/logo-3d.png" alt="Iron Loot">

    <section.trust-pillars>
      <div.pillars-grid>     3 × .pillar-item
        .pillar-icon          SVG inline (escudo, ojo, candado)
        .pillar-title         Seguridad / Transparencia / Valor
        .pillar-text

    <section.active-auctions>
      <div.section-header>   h2 + link "Ver todas"
      <div.auctions-grid>    {% for auction in auctions %}
        <div.auction-card>
          <div.card-image>   placeholder gradient
          <div.card-body>    título, precio, pujas, CTA
      <div.empty-state>      {% if not auctions %}

    <section.how-it-works>   ← Iron Black background
      <h2>
      <div.steps-grid>       3 × .step
        .step-number          01 / 02 / 03 (gold)
        .step-title
        .step-text

    <section.partners>
      <p.partners-label>     "Socios y aliados estratégicos"
      <div.partners-logos>   placeholders (texto o SVG neutral)

    <section.newsletter>
      <div.newsletter-inner>
        <h2> + <p>
        <form.newsletter-form action="#">
          <input[type=email]> + <button.btn-primary>

  <footer.site-footer>       ← en base.html (layout)
    <div.footer-container>
      .footer-col-brand       SVG isotipo + tagline
      .footer-col             Plataforma: Subastas, Cómo funciona
      .footer-col             Soporte: Acerca de, Privacidad
      .footer-col             Legal: Términos, Cookies
    <p.footer-copy>
```

---

## 5. Estructura HTML del LIST (sidebar + grid)

```
<main>
  <div.list-layout>
    <aside.filter-sidebar>
      <form[method=GET action=/auctions]>
        <div.filter-group>
          <h3.filter-title> Categorías
          <ul.filter-list>   <li><a href="?category=X">

        <div.filter-group>
          <h3.filter-title> Estado
          <label><input[type=checkbox name=status value=ACTIVE]> Activa</label>
          <label><input[type=checkbox name=status value=CLOSED]> Cerrada</label>

        <div.filter-group>
          <h3.filter-title> Precio
          <div.price-range>
            <input[type=number name=minPrice placeholder="Mín MXN"]>
            <span> – </span>
            <input[type=number name=maxPrice placeholder="Máx MXN"]>

        <div.filter-group>
          <label.verified-toggle>
            <input[type=checkbox name=verified]> Vendedor verificado

        <button[type=submit].btn-primary.btn-full> Aplicar filtros

    <section.auction-results>
      <div.results-header>
        <span.results-count>  N subastas encontradas
        <select.sort-select name=sort>
          <option value=newest>  Más recientes
          <option value=price_asc>  Precio: menor a mayor
          <option value=price_desc> Precio: mayor a menor
          <option value=ending>     Terminan pronto

      <div.auctions-grid>
        <div.auction-card>   (incluye imagen)
          <div.card-image>   <img src="{{ auction.imageUrl or '/images/placeholder.svg' }}">
          <div.card-badges>  badge de estado
          <div.card-body>
            <h3.card-title>
            <div.price-info>
              .current-price   MXN {{ currentPrice }}
              .start-price     Salida: MXN {{ startingPrice }}
            <div.card-meta>  N pujas · tiempo restante
            <a.btn-primary>  Ver subasta

      <div.pagination>
        {% if page > 1 %}<a href="?page={{ page-1 }}">Anterior{% endif %}
        <span>Página {{ page }}</span>
        {% if hasNextPage %}<a href="?page={{ page+1 }}">Siguiente{% endif %}
```

---

## 6. Estructura del panel de puja (DETAIL)

```
<div.detail-layout>               grid-template-columns: 1.6fr 1fr
  <div.detail-main>
    <div.detail-gallery>          placeholder imagen grande
    <div.detail-info>
      <h1.detail-title>
      <p.detail-description>
      <div.detail-meta>           Vendedor, Categoría, Estado

  <div.bid-panel>
    <div.bid-panel-inner>         sticky, fondo white, borde gunmetal
      <div.current-price-block>
        <span.price-label>  Precio actual
        <div.price-value>   MXN {{ currentPrice }}   ← Montserrat, color gold
      <hr>
      <div.bid-stats>
        <span>{{ totalBids }} oferta(s)</span>
        <span>Tiempo restante: ...</span>
      {% if auction.status == 'ACTIVE' %}
        <a.btn-primary.btn-full href="{{ clientUrl }}/auctions/{{ auction.id }}">
          Pujar ahora
        </a>
        <p.bid-note>  Requiere cuenta · fondos en wallet
      {% else %}
        <p.auction-closed>  Esta subasta no está activa
      {% endif %}
      <a.register-link href="{{ clientUrl }}/auth/register">
        ¿Sin cuenta? Regístrate gratis
```

---

## 7. Patrón de card de auth (5 páginas)

```html
<div class="auth-wrapper">
  <div class="auth-card">
    <div class="auth-header">
      <!-- SVG isotipo centrado -->
      <svg ...><!-- isotipo --></svg>
      <h1 class="auth-title">Iniciar sesión</h1>
    </div>
    <form class="auth-form" ...>
      <div class="form-group">
        <label>Email</label>
        <input class="form-control" type="email" name="email" id="email">
      </div>
      ...
      <button class="btn btn-primary btn-full" type="submit">Entrar</button>
    </form>
    <p class="auth-footer">¿No tienes cuenta? <a href="/auth/register">Regístrate</a></p>
  </div>
</div>
```

---

## 8. ADMIN: cambios mínimos justificados

El admin usa Material Symbols + Inter + estructura sofisticada. La regla es mínimo touch:

- `admin.css`: Solo cambiar `--sidebar-bg` y `--primary`. Añadir `--ff-heading` y aplicarlo a `.page-title` y `h1–h4`.
- `admin.html`: Añadir `<link>` de Montserrat. Reemplazar `<span class="material-symbols-outlined">bolt</span>` del brand por el SVG isotipo (`width="28" height="33"`) + mantener texto "Iron Loot" / "Backoffice".

Impacto: las 27 páginas admin obtienen sidebar más oscuro (#151515) y botones gold automáticamente via CSS variables. Sin tocar ningún template individual.

---

## 9. Cumplimiento de RULE-06 (tests RED/GREEN) en contexto visual

PT-035 modifica exclusivamente CSS y HTML de templates. No existe suite de tests para CSS/HTML en este proyecto (11-Conventions.md no lo requiere para templates Nunjucks). El equivalente al ciclo RED/GREEN es:

| Fase RED | Fase GREEN |
|---|---|
| Estado actual del archivo (leer antes de editar) | Estado post-edición verificado visualmente en browser |
| `npm run build` falla si hay syntax error TypeScript | `npm run build` limpio post-edición |
| Mockup no coincide con sitio actual | Mockup coincide con sitio post-implementación |

Cada task documenta la validación esperada.

---

## 10. Delta respecto al ENRICHMENT

| Elemento ENRICHMENT | Corrección STATE 2 | Estado |
|---|---|---|
| AC-CSP-01/02/03: Modificar main.ts | CSP ya configurada en BASE/CLIENT; admin sin CSP | **Eliminado de scope** |
| AC-CSP-04: Verificar no errores CSP | Sin cambio en main.ts → CSP sin riesgo | **Verificación conservada** |
| SVG vs PNG recortado | Decisión: SVG inline | **Documentado aquí** |
| Admin usa emojis | Admin ya usa Material Symbols | **Eliminado de scope** |

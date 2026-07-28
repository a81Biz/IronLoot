# PT-139 — Cambios de especificación

## Plantillas de ADMIN

| Fichero | Antes | Después |
|---|---|---|
| `views/pages/cms.html:2` | `{% block title %}CMS — IronLoot Admin{% endblock %}` | *(retirado)* |
| `views/pages/seo.html:2` | `{% block title %}SEO — IronLoot Admin{% endblock %}` | *(retirado)* |
| `views/pages/refunds.html:2` | `{% block title %}Reembolsos — …{% endblock %}` | *(retirado)* |
| `views/pages/reconciliation.html:2-3` | `{% block title %}Conciliación — …<script src="/js/pages/pages-reconciliation.js"></script>{% endblock %}` | Bloque retirado; el `<script>` dentro de `{% block scripts %}` |
| `views/pages/refunds.html:8,73` | `data-bs-toggle` / `data-bs-target` / `data-bs-dismiss` | Atributos propios manejados por `pages-refunds.js` |
| `views/pages/refunds.html` | *(sin bloque de scripts)* | `{% block scripts %}` con `pages-refunds.js` |

**El layout no se toca.** `admin.html` seguirá declarando `head`, `content` y `scripts`, y el título
seguirá viniendo de la variable `{{ title }}` (`:6`) que los controladores ya pasan. Añadir un
`{% block title %}` al layout crearía un segundo mecanismo para lo mismo.

## Ficheros nuevos

| Fichero | Qué |
|---|---|
| `src/admin/public/js/pages/pages-refunds.js` | Comportamiento del modal, con `classList`. **Sin `style.display`** |
| `src/api/test/unit/web-views/bloques-de-plantilla-existen-en-su-layout.spec.ts` | Guarda principal |
| `src/api/test/unit/web-views/atributos-bootstrap-sin-bootstrap.spec.ts` | Guarda menor |

## Nueva regla de convenciones

`11-Conventions.md` — **RULE-19**:

> **Todo `{% block X %}` de una plantilla tiene que estar declarado en su layout, y ningún atributo de
> una librería se usa sin que la librería esté cargada.**
> Nunjucks descarta **en silencio** el contenido de un bloque que el padre no declara. Cuatro
> plantillas de ADMIN usaban `{% block title %}` contra un layout que no lo declara (copiado de BASE y
> CLIENT, que sí lo tienen); en tres era peso muerto y en `reconciliation.html` **se tragaba un
> `<script>`**, dejando el botón «Conciliar» muerto desde PT-096 (PT-139). En la misma pantalla de al
> lado, `refunds.html` usaba `data-bs-*` sin que ADMIN tenga Bootstrap.
> Los dos fallan sin error en consola y con la suite en verde — la firma de F-34.
> Lo vigilan `bloques-de-plantilla-existen-en-su-layout.spec.ts` y
> `atributos-bootstrap-sin-bootstrap.spec.ts`.

## `CLAUDE.md` — § Key Technical Decisions

Se amplía el párrafo que ya habla del orden de los `<script>` y la CSP:

> Y un `<script>` **colocado en un bloque que el layout no declara no se carga y nadie protesta**: es
> lo que le pasó a la pantalla «Conciliación» de ADMIN entre PT-096 y PT-139. Antes de dar por hecho
> que un fichero se carga, **mirar la pestaña de red** — que esté escrito en la plantilla no es que el
> navegador lo pida.

## Registros

- `PTSA/PENDIENTES.md` § S-002-G — filas 9 y 10, resueltas. **Con la corrección**: no era «la única
  plantilla del repo con este patrón», eran cuatro con el bloque muerto y una con consecuencia
  funcional.
- `HANDOFF.md` § *Riesgos y deuda abiertos* — se retiran las dos entradas de ADMIN.

## Lo que este PT NO especifica

- Ningún cambio de contrato de API. Los endpoints de conciliación y reembolsos ya existen.
- Ningún cambio de datos ni migración.
- Ninguna dependencia nueva. **No entra Bootstrap.**

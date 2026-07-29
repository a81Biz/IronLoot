# PT-139 — Evidencia

> En `.md` por **F-136-A**.

## 1. Eran cuatro, no una

```
/src/admin/views/pages/cms.html            usa {% block title %} — admin.html no lo declara
/src/admin/views/pages/reconciliation.html usa {% block title %} — admin.html no lo declara
/src/admin/views/pages/refunds.html        usa {% block title %} — admin.html no lo declara
/src/admin/views/pages/seo.html            usa {% block title %} — admin.html no lo declara
```

`layouts/admin.html` declara `head`, `content` y `scripts`. En tres es peso muerto —el título lo pone
el controlador—; en `reconciliation.html` se traga un `<script>`.

**De dónde salió**: BASE (`base.html:7`) y CLIENT (`client.html:6`) **sí** declaran
`{% block title %}`. Alguien copió el idioma correcto de otro sitio a un layout que no lo soporta.

## 2. Y el modal sin librería

```
/src/admin/views/pages/refunds.html -> data-bs-toggle, data-bs-target, data-bs-dismiss
```

Con **cero** Bootstrap en todo ADMIN.

## 3. Verificado renderizando, no leyendo

Con el mismo Nunjucks que sirve ADMIN:

```
pages/reconciliation.html    script=SI  data-bs=no
pages/refunds.html           script=SI  data-bs=no
```

**Ésta es la comprobación que importa.** Leer el HTML fuente sólo diría que el `<script>` está
escrito — que es exactamente la confusión que dejó esto muerto dos meses. Y los dos ficheros se
sirven:

```
pages-reconciliation.js   200  1749B     <- el tamaño exacto que PENDIENTES citaba
pages-refunds.js          200  3162B
```

## 4. La decisión que más pesa: no inventar una tercera forma

ADMIN **ya tenía** convención de modal — `.modal-backdrop.oculto` envolviendo `.modal`, con el CSS
escrito en `admin.css:572-573` y usada por `moderation.html`. Meter la estructura de Bootstrap
(`.modal-dialog > .modal-content`) habría dejado dos maneras de hacer lo mismo en el mismo panel.

Y se muestra con `classList`, nunca `style.display`: lo explica el propio `admin.css:597-601` —
*«`style.display = ''` … ahora el CSS dice oculto: las pestañas de ADMIN se pasaron a `classList` por
eso»*.

> Nota al margen, no corregida aquí: `pages-moderation.js:13,16` usa `style.display = 'flex'/'none'`.
> Funciona —fija un valor explícito, no vacía— pero es el patrón contra el que avisa esa misma regla.
> Se deja anotado en vez de tocarlo: no es lo que este PT vino a arreglar.

## 5. Novena vez que una guarda caza al agente

El comentario que escribí en `reconciliation.html` cita `{% block title %}` para explicar dónde
estaba el `<script>`, y la guarda lo leyó como un uso vivo. Se descartan los comentarios `{# #}`,
con **C5b** de control.

Van tres guardas de esta tanda con la misma lección: **si documentar por qué algo se movió hace
fallar la guarda, la forma de tenerla en verde es no explicar nada.**

## 6. Regresión

```
767 / 767  en 100 suites
Las guardas de CSP —plantillas-sin-js-inline, estilos-fuera-de-plantillas, orden-de-scripts— en verde
```

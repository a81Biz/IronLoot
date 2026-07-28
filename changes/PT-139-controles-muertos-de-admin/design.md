# PT-139 — Design: dos controles muertos en ADMIN, y la guarda que caza la clase

**Tipo**: BUG · **Complejidad**: STANDARD · **Origen**: `PTSA/PENDIENTES.md` § S-002-G, filas 9 y 10
**Depende de**: PT-136

## Lo medido, que es más de lo que estaba registrado

`PENDIENTES.md` decía que `reconciliation.html` era *«la única plantilla del repo con este patrón»*.
**Es cierto para el `<script>` dentro del bloque; es falso para el bloque muerto.**

El layout de ADMIN declara **tres** bloques:

```
src/admin/views/layouts/admin.html:13   {% block head %}
                                 :162   {% block content %}
                                 :171   {% block scripts %}
                                 :6     <title>{{ title }} — Iron Loot Admin</title>   <- VARIABLE, no bloque
```

Y **cuatro** plantillas usan `{% block title %}`, que el layout no declara:

| Plantilla | Qué mete en el bloque muerto | Consecuencia |
|---|---|---|
| `cms.html:2` | Texto | Ninguna. El título real lo pone `cms.controller.ts:36` |
| `seo.html:2` | Texto | Ninguna. `seo.controller.ts:30` |
| `refunds.html:2` | Texto | Ninguna. `refunds.controller.ts:24` |
| **`reconciliation.html:2`** | Texto **+ `<script src="/js/pages/pages-reconciliation.js">`** | **El JS nunca se carga. El botón «Conciliar» está muerto** |

Los controladores pasan `title` como variable, así que los títulos de página son correctos: los tres
primeros bloques son peso muerto inofensivo. **El cuarto se traga un `<script>`.**

**De dónde viene el error**: BASE y CLIENT sí declaran `{% block title %}` en sus layouts
(`base.html:7`, `client.html:6`). Alguien copió el idioma correcto de otro sitio a un layout que no lo
soporta. Nunjucks descarta en silencio el contenido de un bloque que el padre no declara.

## El segundo defecto: un modal sin nada que lo abra

```
src/admin/views/pages/refunds.html:8    data-bs-toggle="modal" data-bs-target="#createRefundModal"
src/admin/views/pages/refunds.html:73   data-bs-dismiss="modal"
```

Atributos de Bootstrap. **No hay Bootstrap en ADMIN**: el layout carga `ui-behaviours.js` y
`admin.js` (`:168-169`) y ninguno maneja modales. `refunds.html` tampoco declara `{% block scripts %}`,
así que hoy no tiene ni dónde poner su JavaScript.

**Reembolsos toca dinero.** «+ Crear reembolso» no abre nada.

## Por qué los dos fallan en silencio

Sin error en consola, sin fallo de suite, sin nada visible salvo que el botón no responde. Es la firma
exacta de **F-34** —la puja en vivo apagada varios días con la suite entera en verde— y de la regla de
CSP sin `'unsafe-inline'`.

Y hay una simetría incómoda que conviene decir: **PT-096 fue quien colocó ese `<script>` en el bloque
equivocado** al sacar el JS inline de las plantillas. PT-102 encontró la mitad de ese daño (la puja en
vivo). Ésta es la otra mitad, dos meses después.

## Decisiones de arquitectura

### D1 — La guarda es el entregable principal

`bloques-de-plantilla-existen-en-su-layout.spec.ts`: **todo `{% block X %}` de una plantilla está
declarado en su layout**, resolviendo la cadena de `{% extends %}`.

Caza los cuatro casos de golpe, cubre ADMIN, BASE y CLIENT, y **cualquier quinto futuro**. Es barata,
determinista y no necesita navegador.

Sin ella, este PT arregla dos botones y dentro de tres meses aparece el tercero — que es exactamente
la historia de PT-096 → PT-102 → PT-139.

### D2 — Los tres bloques muertos se retiran, no se «arreglan»

`cms`, `seo` y `refunds` no necesitan `{% block title %}`: el título ya lo pone el controlador. Añadir
el bloque al layout sería crear un segundo mecanismo para lo mismo. **Se retiran.**

### D3 — El `<script>` de conciliación va a `{% block scripts %}`

Donde ya lo ponen `commissions`, `dashboard`, `moderation`, `notifications`, `reports` y `settings`.
No se inventa nada: se usa el idioma que las otras seis plantillas ya usan.

**Cuidado con el orden**: si `pages-reconciliation.js` usa algún global de `admin.js` o
`ui-behaviours.js`, el bloque `scripts` va después de los dos (`:168-171`), que es correcto. Lo vigila
`orden-de-scripts.spec.ts`, y es la avería literal de F-34.

### D4 — El modal se escribe a mano, sin traer Bootstrap

Con `classList` y **nunca** `style.display = ''` — vaciar el estilo devuelve el elemento a lo que diga
el CSS, que ahora puede ser «oculto». Es RULE-07/RULE-09 y está en `CLAUDE.md`.

Traer Bootstrap para un modal significa: dependencia nueva, CSS que revisar, y riesgo con una CSP que
no lleva `'unsafe-inline'` en ninguna directiva. `refunds.html` necesitará su `{% block scripts %}`,
que hoy no tiene.

**Lo que hay que igualar del comportamiento de Bootstrap** y es fácil olvidar: cerrar con `Esc`, clic
en el fondo, foco al abrir y devuelto al cerrar. Un modal que atrapa el foco es peor que no tenerlo.

### D5 — Segunda guarda, menor

**Ninguna plantilla usa atributos `data-bs-*` si Bootstrap no está cargado en ese sitio.** Barata, y
cierra la puerta a que vuelva el mismo malentendido en otra pantalla.

## Lo que este PT NO decide

- **No rediseña las dos pantallas.** Se recupera la función que debían tener.
- **No audita el resto de ADMIN** buscando más controles muertos por otras causas. La guarda de D1 los
  encontraría si son de esta clase; si son de otra, es otro trabajo.

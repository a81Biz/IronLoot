# REFACTOR_SCOPE — PT-105: los estilos salen de las plantillas (TD-014)

**Fecha**: 2026-07-27 · **Tipo**: REFACTOR · **Complejidad**: STANDARD · **Estado**: STATE 1-R
**Origen**: TD-014, registrada en PT-103 al comprobar que TD-005 sólo estaba cerrada a medias.

---

## 1. Qué cambia y qué NO

### Cambia

Los **93 atributos `style=`** repartidos por 38 plantillas pasan a clases en el CSS del sitio, y
`'unsafe-inline'` sale de `styleSrc` en los tres `main.ts`.

| Sitio | Atributos | Ficheros |
|---|--:|--:|
| BASE | 15 | 12 |
| CLIENT | 51 | 14 |
| ADMIN | 27 | 12 |

### NO cambia

- **Ninguna apariencia.** Es un refactor: lo que se ve antes y después es lo mismo.
- **El JavaScript que cambia estilos** (`el.style.display = …`). La CSP **no cubre** los cambios
  por CSSOM: sólo el atributo en el marcado y los bloques `<style>`. Ese código sigue igual.
- `script-src`, que ya cerró PT-096.
- Las hojas de estilo: no se reorganizan, sólo se les añaden las clases que hagan falta.

## 2. Qué se ha medido, antes de decidir nada

**No hay bloques `<style>` con cuerpo** en ninguna plantilla: el trabajo es sólo de atributos.

Lo que contienen los 93:

| Propiedad | Veces |
|---|--:|
| `display` (21 de ellos `display:none`) | 44 |
| `max-width` | 19 |
| `margin-top` | 17 |
| `font-size` | 11 |
| `gap` · `color` · `margin` · `width` · `padding` | 38 |

**Y sólo dos son dinámicos**, ambos en `client/views/pages/notifications/list.html`:

```
<div style="font-size:.9rem;{% if not n.read %}font-weight:600{% endif %}">
```

Es un condicional, no una interpolación de datos. **Esto es lo que hace el refactor viable**: si
hubiera un `style="width: {{ porcentaje }}%"`, no habría clase que lo sustituyera y habría que
elegir entre romperlo o dejar `unsafe-inline`. No lo hay.

## 3. Listón de calidad — cuándo está terminado

1. `grep -r 'style="' ` sobre las tres carpetas de vistas devuelve **0**.
2. `styleSrc` de los tres `main.ts` **no** contiene `'unsafe-inline'`.
3. **Cero violaciones de CSP** en el recorrido de navegador — que es donde se vería el fallo.
4. Una guarda estática lo vigila, como PT-096 hizo con el JavaScript.
5. TD-014 pasa a cerrada en el registro **con cita** (RULE-08).

## 4. Riesgo de regresión — qué comportamiento debe preservarse exactamente

| Comportamiento | Riesgo | Cómo se comprueba |
|---|---|---|
| **Los 21 `display:none` iniciales** | Un elemento que debía nacer oculto aparece a la vista. Es el fallo más visible y más probable | La clase `.oculto` en el marcado + recorrido de navegador |
| **El JS que muestra/oculta** | Si el JS hace `style.display=''` sobre algo que ahora oculta una **clase**, deja de funcionar: la clase gana | Hay que revisar **cada** caso, no suponerlo. Es el riesgo real de este PT |
| **La apariencia** | Un `max-width` o un `gap` que se pierde descoloca la página | Comparación visual en el recorrido |
| **Los dos condicionales** | Perder el resaltado de notificación no leída | Clase condicional, comprobada |
| **La CSP de ADMIN** | Romperla deja el panel inservible (ya pasó en PT-100) | La suite entera, 193 casos |

> **El segundo riesgo es el que puede morder.** `element.style.display = ''` restaura el estilo
> *inline*, y si lo que oculta ahora es una clase, el elemento sigue oculto. Cada uno de los 21
> casos hay que mirarlo: no vale con sustituir a ciegas.

## 5. Estrategia de vuelta atrás

Rama propia. Si algo se descoloca, `git revert` del merge: no hay migración de datos ni estado que
deshacer. El cambio es marcado y CSS.

## 6. Fuera de alcance

- Reorganizar los CSS o unificar los tres sitios.
- Tocar `script-src` (PT-096) o cualquier otra directiva.
- Los estilos inline que genere el JavaScript en tiempo de ejecución.
- Cerrar el bug: el agente no cierra.

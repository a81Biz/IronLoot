# PT-139 — Fuera de alcance

## Explícitamente excluido

| # | Qué | Por qué | Dónde va |
|---|---|---|---|
| 1 | **Incorporar Bootstrap a ADMIN** | Dependencia nueva, CSS que revisar y riesgo con una CSP sin `'unsafe-inline'` en ninguna directiva, para resolver un modal. Decisión D4 | — |
| 2 | **Rediseñar las pantallas de Conciliación y Reembolsos** | Se recupera la función que debían tener, no se mejora lo que hacen | PT propio si se quiere |
| 3 | **Un componente de modal reutilizable para todo ADMIN** | Hoy hay **un** modal en todo el panel. Generalizar a partir de un caso es inventar requisitos | Cuando haya un segundo |
| 4 | **Auditar las 25 pantallas de ADMIN buscando otros controles muertos** | La guarda de D1 encuentra los de esta clase automáticamente. Los de otras causas —un manejador que se registra sobre un selector que ya no existe, por ejemplo— son otro trabajo | Barrido propio, si se quiere |
| 5 | **Añadir `{% block title %}` al layout de ADMIN** | El título ya viene de `{{ title }}` y los controladores lo pasan. Dos mecanismos para lo mismo es peor que uno | — |
| 6 | **Alinear el idioma de plantillas entre ADMIN, BASE y CLIENT** | ADMIN usa variable y los otros dos usan bloque. Funciona en los tres; unificar es refactor de estilo | PT propio si molesta |
| 7 | **El favicon de ADMIN** | **Ya está hecho**: `favicon.svg` existe y `admin.html:7` lo referencia. `PENDIENTES.md:152` está desactualizado | Lo corrige **PT-140** |
| 8 | **Accesibilidad completa del modal** (ARIA, lectores de pantalla) | Se cubre lo funcional —foco, `Esc`, fondo— que es lo que un usuario nota. Una auditoría de accesibilidad es su propio trabajo | PT propio |

## Lo que sí entra aunque parezca de otro

- **Los tres bloques muertos inofensivos** (`cms`, `seo`, `refunds`). No causan daño, y dejarlos
  significaría que la guarda nace con tres excepciones — una guarda que empieza con excepciones no
  llega a vieja.
- **Corregir `pages-reconciliation.js` si está desfasado.** Lleva dos meses sin ejecutarse y puede
  apuntar a un DOM o a un endpoint que ya cambiaron. **Recuperar la función es el objetivo**, no
  cargar un fichero.
- **El reembolso creado de punta a punta.** Abrir el modal no es crear un reembolso, y reembolsos toca
  dinero.

## Deuda que este PT NO deja

**Cero deuda diferida.** Si al hacer que `pages-reconciliation.js` se cargue aparece que su lógica
está rota contra el API de hoy, se arregla aquí. Dejar un fichero que se carga y falla sería peor que
el estado actual: hoy al menos no hace nada silenciosamente, y entonces haría algo mal.

## Riesgo aceptado explícitamente

**El modal escrito a mano no será idéntico al de Bootstrap.** Animaciones, apilamiento de varios
modales y variantes de tamaño no se replican. Se igualan las cuatro conductas que un usuario nota
(`Esc`, fondo, foco al entrar, foco al salir) y ahí se para.

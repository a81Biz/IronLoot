# PT-189 — Autorrevisión (FDGE STATE 5)

**Fecha**: 2026-07-29 · **Rama**: `docs/PT-189-aud-obsoletos`

---

## Checklist

- [x] **(a)** 81 fragmentos reescritos en 22 documentos. Verificado midiendo: **0 afirmaciones obsoletas**.
- [x] **(b)** UC-17 y UC-18 nuevos; «recepción» en 4 documentos de negocio/producto y «holdback» en 3 — antes **cero**.
- [x] **(c)** Los ocho que faltaban, medidos: 6 corregidos, 2 abiertos.
- [x] **El mecanismo**: guarda + tabla de veredictos de los 36, con «sin verificar» como estado legítimo.
- [x] **La guarda vista fallar en las dos direcciones**: devolviendo una afirmación obsoleta y quitando una fila de la tabla.
- [x] Suite completa **1 000 / 123 suites**.

---

## Tres errores míos, corregidos antes de darlos por buenos

**1. El primer intento fue un arreglo a medias, y lo reverté.** Cambié `⚠️` por `✅` sin reescribir la frase.
Quedaban líneas como *«✅ **No aplicado** — el código sólo exige `>currentPrice`»*. **Cambiar el marcador sin el
texto es peor que no tocar nada**: el documento pasa a contradecirse dentro de la misma línea. Es exactamente el
arreglo aparente del que va toda esta jornada.

**2. El primer listón de la guarda estaba mal puesto.** Exigía la palabra del veredicto en **toda** línea con
señal de problema, y acusó a 18 documentos — la mayoría **diciendo la verdad**. Obligar a anotar cada línea
correcta habría sido un impuesto de prosa y habría enseñado a escribir para la guarda. El defecto real era **uno
solo**: presentar como vivo algo ya corregido.

**3. El parser de veredictos leía prosa.** Cogía cualquier línea con un `AUD` y una palabra de estado, así que el
párrafo que explica *por qué* «36/36» era inexacto hacía que `AUD-016` saliera «corregido». Restringido a la
tabla: **una tabla es un sitio; un párrafo es una coincidencia.**

Los tres son el mismo patrón que llevo cometiendo hoy: **medir la forma en vez de la relación.** Es la quinta vez.
Lo anoto aquí porque contarlo es lo único que lo hace corregible.

---

## Lo que este PT NO afirma

- **No afirma que los 36 AUD estén verificados.** Están **21**: 15 corregidos, 5 abiertos, 1 limitación
  declarada. **Los otros 15 dicen «sin verificar»**, y es literal — puede que estén todos corregidos.
- **No afirma que la guarda compruebe si una afirmación es cierta.** Comprueba que **tenga veredicto** y que no se
  presente como vivo lo corregido. Verificar la verdad exige leer código, y automatizarlo sería volver a la
  heurística que PT-188 tuvo que retirar.
- **No afirma que `docs-v2/1-negocio`, `2-producto`, `3-arquitectura` y `7-ux` estén contrastados enteros.** Se
  midió lo que citaba un `AUD` con señal de problema. Otras afirmaciones de esos documentos siguen sin medir.

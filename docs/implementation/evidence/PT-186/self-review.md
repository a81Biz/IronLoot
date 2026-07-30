# PT-186 — Autorrevisión (FDGE STATE 5)

**Fecha**: 2026-07-29 · **Rama**: `fix/PT-186-h035-completo`
**Cierra**: H-035 (reabierta por decisión del humano)

---

## Checklist

- [x] **Criterio verificado.** H-035 pedía que ninguna variable de conexión tuviera reserva. Ahora se cumple en
      **los cuatro servicios**, no en uno.
- [x] **Escenarios pasando.** 11 casos de la guarda, API **977**, CLIENT **103**, BASE **3**, `typecheck` limpio
      en los tres servicios tocados.
- [x] **Comprobado en vivo, en los dos sentidos.** Sin `API_URL`, BASE **aborta nombrando la variable**. Con las
      variables puestas, `api`/`base`/`client` **healthy** y `CLIENT /dashboard → 302 http://base.ironloot.local/auth/login`
      — la redirección la construye `BASE_URL`, ya por el helper.
- [x] **Sin efectos colaterales.** Ninguna prueba importa `app.controller`, `main.ts` ni el guard, así que abortar
      en la lectura no rompe suites. Se comprobó antes de elegir ese diseño, no después.
- [x] **Commits atómicos**, trazables a PT-186.
- [x] **Documentación al día**: HISTORY, PENDING_TASKS, HANDOFF, la ficha de H-035 con su revisión, E-039 y los
      derivados de PTSA en S-010.

---

## Lo que no salió como estaba planeado

**1. Seis reservas, no cuatro.** Mi medición previa con un script suelto encontró 4; la guarda —que mira más
variables— encontró **6**, incluida una **en el propio API**, que H-035 había declarado limpio.

**El instrumento bueno encontró más que mi estimación**, y eso es el argumento entero de por qué se mide en vez de
declarar. Es exactamente lo que el humano señaló: *«declarar un alcance no es medirlo»*.

**2. La reserva del API la ocultó la guarda.** Su lista de variables de conexión tenía seis nombres y `CLIENT_URL`
no estaba. `E-038` había escrito esa debilidad con estas palabras — *«una variable de conexión nueva que nadie
añada a esa lista no se vigilará»* — y **se cumplió en la corrida siguiente**. Declarar una debilidad no la cierra.

**3. Una reserva se conserva a propósito, y lo digo porque es discutible.** `public-origins.ts` mantiene el
subdominio de desarrollo (`http://base.ironloot.local`) por decisión escrita de PT-089, y la guarda no la acusa
porque no se escribe con `||`.

No la toco. Pero un despliegue de producción que olvide `BASE_URL` **enviaría correos de verificación con enlaces
a un dominio que para el usuario no existe** — sigue siendo la familia de este hallazgo, un peldaño más arriba.
Queda como decisión vista y dejada, no como cabo suelto.

**4. El helper está duplicado en dos apps, y también lo digo.** BASE, CLIENT y ADMIN no dependen de
`@ironloot/core`, así que meterlo ahí obligaría a añadir la librería de dominio a tres despliegues que hoy no la
necesitan, por veinte líneas. El coste de duplicarlas está escrito en los dos ficheros.

---

## Lo que este PT NO afirma

- **Que no queden reservas de conexión.** Sostiene que no quedan **de las nueve variables de la lista** en los
  cuatro servicios. La lista sigue siendo el límite, y esta corrida demuestra que ese límite muerde.
- **Que el aborto se haya probado en los cuatro.** Se probó en **BASE**. CLIENT usa el mismo helper; el API tenía
  el suyo desde PT-126.

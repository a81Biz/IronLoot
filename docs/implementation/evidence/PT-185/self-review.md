# PT-185 — Autorrevisión (FDGE STATE 5)

**Fecha**: 2026-07-29 · **Rama**: `fix/PT-185-la-mitad-de-rule-17-sin-guarda`
**Cierra**: H-035 (D2, MEDIA)

---

## Checklist

- [x] **Criterio verificado.** La ficha pedía dos cosas y decía que la segunda valía más: el cerrojo recibe su URL
      por inyección, y **existe guarda para la mitad de RULE-17 que no la tenía**.
- [x] **Escenarios pasando.** 7 casos de la guarda nueva + 11 del cerrojo, suite completa **973 / 120 suites**,
      `typecheck` limpio, `audit:check` sin avisos, y en vivo `/health/detailed` con `redis up` tras el cambio de
      constructor.
- [x] **Vista fallar, y con precisión.** Antes del arreglo acusó **un solo fichero**, exactamente el que la ficha
      describe. Una guarda que acusa a medio repositorio la primera vez suele estar midiendo mal.
- [x] **Sin efectos colaterales.** El cambio de constructor rompió el módulo de prueba del propio cerrojo —doce
      casos— y está arreglado declarando la dependencia nueva donde toca.
- [x] **Convenciones respetadas.** Es RULE-17, aplicada donde la propia regla decía que estaba el problema.
- [x] **Commits atómicos**, trazables a PT-185.
- [x] **Documentación al día**: HISTORY, PENDING_TASKS, HANDOFF, la ficha, E-038 y los derivados de PTSA en S-009.

---

## Lo que no salió como estaba planeado

**1. En Redis el defecto no era el que fui a buscar.** Iba por un tope, como en H-033 y H-034. Los dos clientes
`ioredis` no declaran topes propios, pero **la biblioteca trae los suyos** —10 s de conexión, reintentos acotados—,
así que aquí no hay un equivalente a los dos minutos de nodemailer: **por ese lado no había hallazgo**.

Lo que apareció al mirar fue la reserva a `localhost`, que es otro defecto y de otra dimensión (D2, no D3).
**Buscar una cosa y encontrar otra sólo pasa si se mira de verdad** — si hubiera hecho `grep` de `timeout` y me
hubiera ido, no habría visto nada.

**2. Del almacenamiento no salió hallazgo, y eso también es un resultado.** `upload.service.ts` escribe con
`writeFile` local: sin servicio remoto en v1.0, el patrón de H-034 no tiene dónde darse.

Lo escribo porque **«queda por mirar» y «se miró y no aplica» son estados distintos**, y sólo el segundo cierra un
pendiente. Dejarlo en la lista habría hecho crecer los pendientes mientras el trabajo se cerraba, que es justo lo
que se corrigió en `PENDING_TASKS.md` hace unos días.

**3. El hallazgo real es sobre una guarda, no sobre el código.** Esto es lo más útil del PT y conviene decirlo
sin adornos: `distributed-lock.service.ts` conservó su `||` a través de PT-137, de PT-147 y de todas las corridas
de la suite **porque había una guarda con el nombre correcto mirando otra cosa**. La de RULE-17 comprueba que las
variables estén declaradas; la regla dice, en negrita, que *el problema era la reserva*.

Es la segunda vez hoy que aparece esta forma —H-031 tenía la guarda del holdback mirando el servicio cuando el
agujero estaba en el compose—, y aparece lo suficiente para nombrarla: **una guarda puede existir, tener el nombre
correcto y mirar al lado del agujero.**

De ahí la recomendación que deja esta corrida, que no es buscar código sospechoso sino preguntar por cada regla:
**¿vigila la parte fácil de medir o la que causó su incidente?**

---

## Lo que este PT NO afirma

- **Que el fallo se haya observado.** `docker-compose` declara `REDIS_URL`, así que la reserva no se usaba en
  ninguno de los entornos existentes. El daño era **potencial** — igual que en H-029 (el captcha) y H-031 (el
  holdback): el día que alguien despliegue sin la variable.
- **Que no queden reservas fuera del API.** La guarda mira `src/api/src`. **ADMIN, BASE y CLIENT no están
  cubiertos**, y **ADMIN tuvo exactamente este defecto en PT-147** — es el sitio más probable para el siguiente, y
  hoy no hay nada que lo impida. Queda escrito como pendiente, no dado por hecho.
- **Que la lista de variables de conexión esté completa.** Son seis, elegidas por apuntar a un servicio. Una
  variable de conexión nueva que nadie añada a esa lista **no se vigilará**: es una debilidad conocida de la
  guarda, no un descuido, y por eso está dicha aquí y en la evidencia.

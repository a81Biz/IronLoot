# PT-111 — Evidencia

> **Extraida de `HISTORY.log` por PT-195 (2026-07-30), no re-ejecutada.**
>
> Este PT registro su evidencia **en prosa dentro de la entrada del log**, que era la convencion que se
> siguio ese dia. `rastro-de-trabajo-completo.spec.ts` (RULE-34) exige una carpeta, y la linea base solo
> puede **bajar** —por diseno: la salida prevista es anadir evidencia, no declarar mas huecos—. Se
> traslada aqui **literalmente lo que el log ya decia**, sin anadir ni una comprobacion que no se hiciera.
>
> **Lo que este fichero NO afirma**: que se haya vuelto a ejecutar nada hoy. Rehacerlo semanas despues y
> presentarlo como la evidencia original seria peor que no tenerla.

**Fecha del trabajo:** 2026-07-27
**Entrada:** `docs/implementation/HISTORY.log`, `## PT-111`

---

## Lo que se ejecuto y se observo

Login **302**, clave `sess:*` presente en Redis, `docker restart` y **la sesion sigue abierta**
(antes rebotaba a `/login`).

**0 `ECONNREFUSED`** frente a **77** antes del arreglo.

Suite completa: smoke **57/57**, admin-writes **4/4**.

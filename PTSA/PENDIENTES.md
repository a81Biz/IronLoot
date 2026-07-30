# PENDIENTES.md — Bloqueantes y preguntas abiertas

**PTSA V3** · **Última actualización:** 2026-07-29 (S-004-M — medición dirigida)

> **Este fichero es ESTADO, no log.** Llegó a tener siete bloques de sesión apilados —DS-004 …
> S-002-G—, ninguno podado, con el mismo pendiente repetido **cinco veces** y sin que nada dijera cuál
> mandaba. PTSA ya declara que `ESTADO_ACTUAL.md` y `RESUMEN.md` se sobrescriben y que sólo
> `AUDIT_LOG.md` es append-only; esto pertenece a la primera clase.
>
> Los siete bloques anteriores están íntegros en **`PTSA/archive/PENDIENTES-hasta-S-002-G.md`**.
> Nada se ha borrado: `[A6]` se cumple archivando.

---

## Bloqueantes activos

**Ninguno.** `BLQ-001` (BD no disponible) y `BLQ-002` (logs no disponibles) se cerraron en S-002.

---

## Lo abierto de peso

| # | Pendiente | Responsable |
|---|---|---|
| 1 | **H-005 — quién emite la factura.** Tres modelos en `evidence/PT-155/hallazgos.md`. Mantiene D1 en 85 y bloquea P-012. **Ningún PT puede resolverlo**: no hay código que sustituya a un PAC certificado ante el SAT | Humano (negocio + fiscal) |
| 2 | **Un `resume PTSA` que recalcule y emita.** Los scores se midieron con cuatro hallazgos activos y hoy hay uno; la aritmética daría D2 = 100 y D3 = 100. Y es buen momento: la base tiene salida real | Humano (disparador PTSA) |

**Es todo.** Los tres hallazgos corregibles —H-025, H-026, H-027— se cerraron el 2026-07-29 con VoBo
humano, cada uno verificado ejecutando y no leyendo.

---

## Lo que se podó, y por qué se deja dicho

**S-004 retiró la fila del `resume PTSA`: se ejecutó.** Los scores están recalculados y emitidos,
`freshness = FRESH`, `commits_since_audit = 0`.

**Y S-004-M retiró la de «medir D1 y D5»: también se hizo.** `run-all.sh` generó salida real y se midió
**en la misma sesión**, sin cortar. Resultado: **D1 al 86 %** (12 de 14 reglas, las 12 cumplen), **D5
medido por primera vez** y la Confianza de **83.6 a 97.9**. Las dos veces anteriores se midió en la sesión
siguiente y la salida ya no estaba — el patrón se rompió midiendo a continuación.

**PT-168 quitó cuatro filas que estaban hechas.** Este fichero listaba H-021, H-022, H-023 y H-024
como abiertos con responsable «Agente, bajo FDGE». Los cuatro están `CERRADA` desde el 2026-07-29,
corregidos por PT-149, PT-153, PT-162 y PT-157, con VoBo humano, y PT-168 lo verificó ejecutando.

**Y es exactamente lo que la cabecera de arriba prohíbe.** Este fichero se reescribió en S-003 por
haber acumulado siete bloques sin podar; volvió a acumular en **una sola jornada** — la misma en que se
cerró el trabajo que declaraba pendiente. Un registro de estado que crece mientras el trabajo se cierra
es el síntoma que abrió PT-140. Lo vigila ahora `estado-de-hallazgos-coherente.spec.ts` (**RULE-33**).

---

## Pendiente de VoBo humano

**Ninguno.** `PT-166 … PT-172` se cerraron con VoBo humano explícito el 2026-07-29, junto con la tanda
del 28/29. Detalle en `docs/implementation/HISTORY.log`.

Lo que espera ahora **no es validación, es corrección**: H-025, H-026 y H-027, arriba. `[R44]` prohíbe al
agente cerrarlos, así que cuando estén corregidos volverán aquí como `CORREGIDA` esperando tu palabra.

---

## Lo que se sabe que falta medir

| # | Qué | Nota |
|---|---|---|
| 1 | **Vulnerabilidades de la imagen base** | `audit:check` mira npm. **TD-016**. Más barato ahora que PT-147 construye las imágenes en CI |
| 2 | La guarda del contrato SSR↔API no cubre **ADMIN ni BASE** | Ampliación barata |
| 3 | La suite QA corre sobre **HTTP** | Cuando haya TLS local |
| 4 | ¿Más servicios que mezclen un DTO transformado contra un JSON almacenado? (patrón de H-019) | Barrido |
| 5 | `/api/v1/users/:id/ratings` exige sesión | Humano decide |
| 6 | **D1: dos reglas** — `R-5.1a` y `R-5.1d` | **Resuelto al 86 %.** Faltan las dos que exigen una subasta en `CLOSED`, y hay 0: la suite no espera los 120 s de la ventana de cierre |
| 7 | **D5 — MEDIDO** ✔ | Success 100 % · Retry 0 % · Failure 0 %, sobre 3 ciclos (1 resuelto). Muestra fina, pero es la primera medición real |
| 8 | **La vía garantizada de PayPal, sin ejercer** | Su fase falló por la UI de sandbox de un tercero — y el resumen no lo dijo (**H-027**) |

> **La lección de la ventana, ya aplicada y con resultado medido.** `run-all.sh` trunca la base al
> empezar, así que la salida que genera hay que medirla **en la misma sesión**. Se hizo el 2026-07-29 y
> valió **14.3 puntos de Confianza** (83.6 → 97.9) más la primera medición de D5 de toda la auditoría. Las
> dos veces anteriores se midió en la sesión siguiente y la salida ya no estaba.
>
> Lo que queda de las filas 6 y 8 **no se resuelve con otra corrida igual**: hace falta que la suite cierre
> una subasta (fila 4) y que la fase de PayPal deje de depender de una UI ajena.

---

## Resueltos, y merece dejar constancia

- **`CLAUDE.md` citaba `PTSA/Motor-PTSA.md` y `PTSA/PTSA.md`; ninguno existe.** Pendiente desde
  **DS-004** y repetido en cinco bloques. Lo resuelve **PT-141.A** — que es lo que pasa cuando un
  pendiente tiene por fin un PT en vez de una fila que se copia de sesión en sesión.
- **«Los 12 productos siguen en `BORRADOR`»** — falso desde antes de anotarse: son **11 `VALIDADO`**
  y **1 `IDENTIFICADO`**. Lo detectó FPGE-002 al verificar candidatos, y S-003 lo confirmó contra los
  ficheros `P-XXX`.
- **«Definir las rúbricas en F-1»** — ya estaban, en **`F-1 § 5`**, con cuatro criterios y el
  checklist dándolas por identificadas. Dos pendientes vivos que estaban resueltos: en pequeño, lo
  mismo que abrió PT-140.
- **Los dos defectos de ADMIN** de S-002-G (filas 9 y 10) — cerrados por **PT-139**.
- **ADMIN sin favicon** — ya estaba hecho cuando se anotó: `favicon.svg` existe desde antes.

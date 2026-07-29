# PENDIENTES.md — Bloqueantes y preguntas abiertas

**PTSA V3** · **Última actualización:** 2026-07-29 (S-004 — delta sync)

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
| 1 | **H-025 — el veredicto de coherencia sale verde sobre una base vacía.** `cross_coherence_verified = verificado` con cero pedidos, pagos, comisiones y asientos: las cinco consultas devuelven «0 incoherencias» porque no hay nada que comparar. Sexta aparición del patrón; el docstring declara la protección que el código no implementa. ALTA, D2 | Agente, bajo FDGE |
| 2 | **H-026 — Redis no se puede observar.** `/health/detailed` dice `degraded` siempre, y una caída real de Redis diría lo mismo. MEDIA, D3 | Agente, bajo FDGE |
| 3 | **H-005 — quién emite la factura.** Tres opciones en `F-1 § U-005`, con sus consecuencias técnicas medidas en `evidence/PT-155/hallazgos.md`. Mantiene D1 en 85 y bloquea P-012. **Ningún PT puede resolverlo** | Humano (negocio + fiscal) |
| 4 | **Una corrida `run-all.sh` y medir D1 y D5 inmediatamente después.** Es lo único que sube la Confianza (83.6). La ventana es estrecha: `run-all.sh` trunca la base al empezar, y ya se llevó la salida de S-002 **y** la de S-003 | Humano decide cuándo; el agente mide |

---

## Lo que se podó, y por qué se deja dicho

**S-004 retiró la fila del `resume PTSA`: se ejecutó.** Es esta corrida. Los scores están recalculados y
emitidos, `freshness = FRESH`, `commits_since_audit = 0`.

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

Lo que espera ahora **no es validación, es corrección**: H-025 y H-026, arriba. `[R44]` prohíbe al agente
cerrarlos, así que cuando estén corregidos volverán aquí como `CORREGIDA` esperando tu palabra.

---

## Lo que se sabe que falta medir

| # | Qué | Nota |
|---|---|---|
| 1 | **Vulnerabilidades de la imagen base** | `audit:check` mira npm. **TD-016**. Más barato ahora que PT-147 construye las imágenes en CI |
| 2 | La guarda del contrato SSR↔API no cubre **ADMIN ni BASE** | Ampliación barata |
| 3 | La suite QA corre sobre **HTTP** | Cuando haya TLS local |
| 4 | ¿Más servicios que mezclen un DTO transformado contra un JSON almacenado? (patrón de H-019) | Barrido |
| 5 | `/api/v1/users/:id/ratings` exige sesión | Humano decide |
| 6 | **D1 completo** — **13 de 14** reglas sin datos que mirar (en S-003 eran 7) | La base está **vacía**: 0 usuarios. **El impedimento técnico ya no existe**: PT-153 cerró H-022 y los checkpoints corren donde vive npm. Lo que falta son datos |
| 7 | **D5 completo** — Success / Retry / Failure | Cero ciclos de pago. Mismo bloqueo que #6 |

> **Los tres bloqueos de arriba se resuelven igual:** una corrida `run-all.sh` genera salida real.
> **Medir D1 y D5 justo después**, antes de que otro reseteo se la lleve — `run-all.sh` trunca la
> base al empezar, y es lo que se llevó la salida de S-002 **y la de S-003**. Dos veces es un patrón:
> la medición hay que hacerla en la misma sesión que genera los datos, no en la siguiente.

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

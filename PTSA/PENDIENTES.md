# PENDIENTES.md — Bloqueantes y preguntas abiertas

**PTSA V3** · **Última actualización:** 2026-07-29 (podado por PT-140)

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

## Lo único abierto de peso

| # | Pendiente | Responsable |
|---|---|---|
| 1 | **H-005 — quién emite la factura.** Único hallazgo activo del sistema. Tres opciones en `F-1 § U-005`. Mantiene D1 en 85 y bloquea P-012. **Ningún PT puede resolverlo** | Humano (negocio + fiscal) |

---

## Pendiente de VoBo humano

`[R44]` prohíbe al agente cerrar hallazgos. Los de la tanda del 2026-07-28/29 no tienen hallazgo PTSA
asociado —son defectos nuevos, no correcciones de auditoría— pero sí esperan validación como BUG:
ver `docs/implementation/PENDING_TASKS.md` § 2.

---

## Lo que se sabe que falta medir

| # | Qué | Nota |
|---|---|---|
| 1 | **Vulnerabilidades de la imagen base** | `audit:check` mira npm. **TD-016**. Más barato ahora que PT-147 construye las imágenes en CI |
| 2 | La guarda del contrato SSR↔API no cubre **ADMIN ni BASE** | Ampliación barata |
| 3 | La suite QA corre sobre **HTTP** | Cuando haya TLS local |
| 4 | ¿Más servicios que mezclen un DTO transformado contra un JSON almacenado? (patrón de H-019) | Barrido |
| 5 | `/api/v1/users/:id/ratings` exige sesión | Humano decide |
| 6 | Los 12 productos siguen en `BORRADOR`; falta auditar la salida real de seis | F3, próxima sesión |
| 7 | **Definir las rúbricas en F-1.** Sin ellas ningún producto llega a `VALIDADO` (`[R38]`) | F12 |

---

## Resueltos, y merece dejar constancia

- **`CLAUDE.md` citaba `PTSA/Motor-PTSA.md` y `PTSA/PTSA.md`; ninguno existe.** Pendiente desde
  **DS-004** y repetido en cinco bloques. Lo resuelve **PT-141.A** — que es lo que pasa cuando un
  pendiente tiene por fin un PT en vez de una fila que se copia de sesión en sesión.
- **Los dos defectos de ADMIN** de S-002-G (filas 9 y 10) — cerrados por **PT-139**.
- **ADMIN sin favicon** — ya estaba hecho cuando se anotó: `favicon.svg` existe desde antes.

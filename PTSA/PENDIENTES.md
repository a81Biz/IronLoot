# PENDIENTES.md — Bloqueantes y preguntas abiertas

**PTSA V3** · **Última actualización:** 2026-07-29 (S-005 — delta sync)

> **Este fichero es ESTADO, no log.** Llegó a tener siete bloques de sesión apilados —DS-004 …
> S-002-G—, ninguno podado, con el mismo pendiente repetido **cinco veces** y sin que nada dijera cuál
> mandaba. PTSA ya declara que `ESTADO_ACTUAL.md` y `RESUMEN.md` se sobrescriben y que sólo
> `AUDIT_LOG.md` es append-only; esto pertenece a la primera clase.
>
> Los siete bloques anteriores están íntegros en **`PTSA/archive/PENDIENTES-hasta-S-002-G.md`**.
> Nada se ha borrado: `[A6]` se cumple archivando.

---

## Bloqueantes activos

**Ninguno para auditar.** `BLQ-001` (BD no disponible) y `BLQ-002` (logs no disponibles) se cerraron en
S-002. La base tiene historia desde el `run-all.sh` del 2026-07-31, así que los cinco checkpoints —incluidos
`audit:domain` y `audit:reliability`, que la necesitan— se ejecutan sin bloqueo.

---

## Lo abierto de peso

No son bloqueantes de auditoría —nada impide medir—, pero son lo que impide subir el score.

| Qué | Impide | Quién lo resuelve |
|---|---|---|
| **`H-042`** — el webhook con firma fabricada obtuvo `SIGNATURE_OK` | D2 al 100. Es el **único hallazgo activo** | `PT-234` (INVESTIGATION). Tres hipótesis por separar **midiendo** |
| **3 ciclos de pago de 20** | `D5` sale del 0 % y `coverage` de 90 | Volumen real de operación, no código |
| **La suite no abre ninguna disputa** | `cross_coherence_verified` deja de ser `sin_datos`: es 1 de 5 comprobaciones sin filas que comparar | Una fase de QA que abra una disputa |
| **El texto legal** (`TD-028`, `L-01`…`L-08`) | Nada del score: es deuda declarada, no hallazgo | Asesoría jurídica. No es trabajo FDGE |

> **Por qué el texto legal está aquí y no como hallazgo abierto.** El hallazgo era *«el producto afirma
> lo que sus propias reglas niegan»*, y las afirmaciones falsas se retiraron: la portada, el
> consentimiento del registro, la política de cookies y el canal de datos personales. Lo que queda —la
> redacción de términos y privacidad— es **deuda declarada** (`TD-028`), no el mismo defecto sin cerrar.
> Se dice porque la tentación de dejar `H-041` abierto «hasta que esté todo» existe, y produciría un
> hallazgo que nunca cierra por depender de un tercero.

---

## Preguntas abiertas de método

**¿La pantalla es un producto auditable?** `H-038` dejó demostrado que un certificado `Clase A` puede
convivir con once defectos P0 en la interfaz, porque PTSA audita **productos de datos** y las 14 reglas de
dominio se cumplen sobre las filas — y se cumplirían igual con el catálogo apagado.

`PT-213` puso la guarda que faltaba para el contrato de listas, y `ADR-061` corrigió lo que significa un ✅
en el `PRD`. Lo que sigue abierto es la **definición**: ¿un producto `P-013 «superficie de usuario»`? ¿un
checkpoint que renderice las rutas SSR contra datos reales y falle si una lista queda vacía teniendo filas?

Es una decisión de **la especificación de PTSA**, no de un PT de desarrollo. Propuesta en
`FPGE-005 / R-052`.

**Y una respuesta que esta jornada ya dio:** la suite de navegador encontró en una corrida **dos
regresiones** que 1.441 pruebas unitarias, `tsc` y ESLint no vieron —una plantilla que no renderiza y un
desbordamiento visible sólo en modo `headed`— más `H-042`. **Ejecutarla no es opcional antes de emitir un
certificado.**

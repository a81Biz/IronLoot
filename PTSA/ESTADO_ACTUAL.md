# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-29 | **Sesión**: S-005 (delta sync)

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase A
Health:         100 / 100      cero hallazgos activos
Risk:           0 / 100        Risk_bruto = 0
Confidence:     91.0 / 100     A UN PUNTO del umbral de A — la baja D5 al 0 %
Freshness:      FRESH          medido el 2026-07-29, commits_since_audit = 0
Cobertura:      PARCIAL        D1/D2/D3/D4 al 100 % · D5 al 0 % (muestra insuficiente)
```

**Regla del Agua Potable: NO activada** — D1 = 100. Se dice porque `[A4]` lo exige.

---

## ⚠ Tres cosas que hay que leer antes del 100

**1. El Health llega a 100 en parte porque el alcance se estrechó.** H-005 se cerró **aceptándola como
limitación declarada**, y lo que legitima ese cierre es que la declaración de valor se corrigió a la vez
(`F-1 § U-006`): el producto ya **no promete** emitir CFDI. **El sistema sigue sin emitir facturas.**

**2. La Confianza está a un punto del umbral.** 91.0 contra 90. La baja **D5, que está al 0 %**: la
fiabilidad operacional **no está demostrada** — 2 ciclos de pago no son una serie. Cualquier pérdida de
cobertura tumba la Clase A.

**3. Cero hallazgos activos es cero defectos CONOCIDOS.** Hoy, un día de mirar y ejecutar produjo **ocho
hallazgos**, y **cinco llevaban meses en el código**. Este `0` mide lo que se ha buscado, no lo que hay.

---

## Dimensiones

| Dim | Score | Estado | Penaliza hoy |
|---|---:|---|---|
| D1 Alineación de Dominio | **100** | +15 · H-005 cerrada, y **14/14 reglas medidas** | — |
| D2 Integridad Arquitectónica | **100** | +15 · H-025 cerrada | — |
| D3 Observabilidad y Recuperación | **100** | +10 · H-026 y H-028 cerradas | — |
| D4 Fidelidad Documental | 100 | Estable | — |
| D5 Fiabilidad Operacional | `SIN_DATOS` | **Por muestra insuficiente**, no por falta de datos | — |

`health_unstable = false`. La distinción de D5 —«no puedo pronunciarme» en vez de un rojo o un verde
falsos— es el hallazgo **H-028**, nacido y cerrado en esta misma corrida.

---

## Hallazgos activos: 0

**Cerrados: 28** — H-001 … H-028. Ninguno reabierto.

---

## Los cuatro que cerró esta corrida, verificados ejecutando

| Hallazgo | PT | Cómo se comprobó |
|---|---|---|
| **H-005** | decisión | Aceptado como limitación declarada, con `F-1 § U-006` enmendando el alcance |
| **H-025** | PT-177 | El veredicto dice `0 de 1`, marca `sin filas que comparar` y sale con **1** |
| **H-026** | PT-178 | En vivo: en pie → `healthy`; parado → `unhealthy` + «PING sin respuesta en 2000 ms» |
| **H-028** | PT-180 | `SIN_DATOS` + «MUESTRA INSUFICIENTE (<20)», `health_unstable = false` |

Evidencia: `E-033`, y `docs/implementation/evidence/PT-177/`, `PT-178/`, `PT-180/`.

---

## Productos: 12

`VALIDADO` **11** · `FUERA_DE_ALCANCE_V1` **1** (`P-012 CfdiRecord`).

`P-012` **no pasa a `VALIDADO`**: el producto no se genera. Sale del inventario de v1.0 con su motivo
escrito y su **reapertura declarada** — si v1.1 vuelve a prometer la factura, vuelve y H-005 se reabre con
él. `[A6]`: no se degrada ni se borra.

---

## Qué falta medir, y por qué

| Qué | Bloqueo |
|---|---|
| **D5** (Success / Retry / Failure) | **Volumen**: hacen falta **20 ciclos resueltos** y hay **2**. Los umbrales (`>= 95 %` verde) no pueden expresar «bien» por debajo de veinte |
| Coherencia P-003 → P-006 | **0 disputas** en la base. La comprobación corre y lo declara: `0 de 0`, `sin filas que comparar` |

**Ninguno de los dos es un defecto del sistema ni de la herramienta.** Son datos que no existen todavía, y
desde H-025 y H-028 los instrumentos **lo dicen** en vez de dar verde.

**Lo que NO falta ya:** D1 llegó al 100 % porque la **fase 35** (PT-175) cierra una subasta de verdad, así
que `R-5.1a` y `R-5.1d` por fin se midieron.

---

## Siguiente

1. **Volumen de ciclos de pago** — lo único que sube D5 y saca la Confianza del filo de 91.
2. **La decisión fiscal, cuando haya PAC.** Tres modelos medidos en `evidence/PT-155/hallazgos.md`. La C es
   subconjunto de la B; la B exige datos que **no se pueden pedir retroactivamente**.
3. **Seguir mirando.** Ocho hallazgos en un día, cinco de ellos viejos. La auditoría no encuentra defectos
   porque el sistema empeore: los encuentra porque alguien mira.

> **Este fichero es un derivado.** Manda `PTSA/Hallazgos/H-XXX.md`. Lo vigila
> `estado-de-hallazgos-coherente.spec.ts` (**RULE-33**).

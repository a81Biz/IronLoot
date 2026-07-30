# PTSA V3 — RESUMEN DE AUDITORÍA
## IronLoot Auction Platform v1.0.0

**Sesión**: S-005 — **delta sync** (`resume PTSA`) | **Fecha**: 2026-07-29
**Disparador**: petición del humano tras aceptar H-005 como limitación declarada y cerrar los catorce PT
de la jornada.
**auditoria_estado**: CERRADA_SIN_HALLAZGOS_ACTIVOS

---

## SCORES — CLASE A

| Métrica | S-004-M | **S-005** | Cambio |
|---|---|---|---|
| **Health Score** | 88.0 | **100 / 100** | +12.0 |
| **Risk Score** | 100 | **0 / 100** | −100 |
| **Confidence** | 97.9 | **91.0 / 100** | −6.9 |
| **Clasificación** | B | **A** | Subida |

```
Health = (100×0.30) + (100×0.30) + (100×0.30) + (100×0.10) = 100
Risk   = min(100, 0 × 4) = 0                    Risk_bruto = 0 — cero hallazgos activos
Conf   = 80×0.40 + 100×0.25 + 95×0.20 + 100×0.15 = 91.0
```

**Regla del Agua Potable: NO activada.** D1 = 100. Se dice porque `[A4]` lo exige.

**§15.6 se cumple por los dos lados**: Health ≥ 90 **y** Confidence ≥ 90. `freshness = FRESH` → sin cap.
`health_unstable = false` → sin cap por D5.

---

## ⚠ Cómo hay que leer este 100, porque un número así invita a no leerlo

Tres advertencias, y ninguna es retórica.

**1. El Health llega a 100 en parte porque el alcance se estrechó, no sólo porque se arreglara.** H-005
—la facturación fiscal— se cerró **aceptándola como limitación declarada** por decisión del humano. Lo que
legitima ese cierre es que **la declaración de valor se corrigió a la vez** (`F-1 § U-006`): el producto ya
**no promete** emitir CFDI, y `P-012` pasó a `FUERA_DE_ALCANCE_V1`. El hueco que D1 mide —entre lo declarado
y lo entregado— se cerró **por el lado de la declaración**. El sistema sigue sin emitir facturas.

**2. La Confianza está a UN punto del umbral de A.** 91.0 contra un mínimo de 90. La baja **la cobertura
de D5, que es 0 %**: la fiabilidad operacional **no está demostrada**. Dos ciclos de pago no son una serie,
y desde PT-180 el instrumento lo dice en vez de inventarse un veredicto. Cualquier pérdida de cobertura
tumba la Clase A.

**3. Cero hallazgos activos no es cero defectos: es cero defectos CONOCIDOS.** Hoy, **un día de mirar y
ejecutar produjo ocho hallazgos** —H-025 a H-028 y cuatro `F-176-x`—, y **cinco de ellos llevaban meses en
el código**. Un `0` en esta columna mide lo que se ha buscado, no lo que hay. La lectura correcta de esta
emisión no es «el sistema está perfecto» sino **«no queda nada abierto de lo que sabemos, y lo que sabemos
creció mucho hoy»**.

---

## SCORES POR DIMENSIÓN

| Dimensión | S-004-M | **S-005** | Penaliza hoy |
|---|---|---|---|
| D1 Alineación de Dominio | 85 | **100** | — |
| D2 Integridad Arquitectónica | 85 | **100** | — |
| D3 Observabilidad y Recuperación | 90 | **100** | — |
| D4 Fidelidad Documental | 100 | **100** | — |

**D5**: `SIN_DATOS` **por muestra insuficiente**, no por ausencia de datos — y la diferencia es el hallazgo
H-028. `health_unstable: false`. Alucinación y drift `NO_APLICA` (sistema determinista).

---

## LO QUE CERRÓ ESTA CORRIDA

**Cuatro hallazgos**, y cada uno verificado **ejecutando**:

| Hallazgo | Dim | PT | Cómo se comprobó |
|---|:--:|---|---|
| **H-005** (ALTA) | D1 | — | **Decisión de negocio**: aceptado como limitación declarada, con `F-1 § U-006` enmendando el alcance |
| **H-025** (ALTA) | D2 | PT-177 | El veredicto dice `0 de 1`, marca `sin filas que comparar` y sale con **1** |
| **H-026** (MEDIA) | D3 | PT-178 | En vivo: en pie → `healthy`; parado → `unhealthy` + «PING sin respuesta en 2000 ms» |
| **H-028** (MEDIA) | D3 | PT-180 | `SIN_DATOS` + «MUESTRA INSUFICIENTE (<20)» y `health_unstable = false` |

Y **H-027** ya venía cerrado de S-004-M por PT-176.

### H-028, que nació y murió dentro de esta misma corrida

La primera medición de D5 dio `Success Rate 50 % ROJO` → `health_unstable = true` → **clase capada a B**. Y
el sistema no estaba inestable: el ciclo que usó la vía garantizada la usó porque el sandbox de PayPal no
notificó, que es **lo que PT-087 diseñó**.

Con `n = 2`, una tasa sólo puede valer 0 %, 50 % o 100 %, y el umbral verde es `>= 95`: **un solo fallback
fuerza ROJO por aritmética**. Y al revés es peor — `1 de 1` daba `100 % VERDE`, que fue exactamente la
primera medición de D5 de esta auditoría.

`reliability-check.ts` **ya llevaba escrita esta lección** por PT-122, que corrigió **qué** ciclos entran en
el denominador. Nadie miró **cuántos**. Misma familia que H-025.

### Dos `catch` mudos míos, cazados por el checkpoint que existe para eso

D3 dio **27** silencios contra una línea base de 25: dos `catch` nuevos en el JS del detalle de pedido
—introducidos por PT-174 esta misma jornada— que avisaban a la persona y **no dejaban rastro del error**.
Corregidos en PT-180. El checkpoint funcionó sobre trabajo de hace unas horas.

---

## COBERTURA DECLARADA — `[A8]`

| Dimensión | Cobertura | Por qué |
|---|---:|---|
| D1 Dominio | **100 %** | **14 de 14 reglas medidas, las 14 cumplen.** Primera emisión sin una sola `n/d` |
| D2 Integridad | 100 % | Esquema verificado en la base **y contra el modelo**; 0 vulnerabilidades |
| D3 Observabilidad | 100 % | Silencios en línea base, `trace_completeness` 100 %, endpoints en vivo en los dos estados |
| D4 Documental | 100 % | 135 pruebas en 12 guardas de documentación |
| **D5 Fiabilidad** | **0 %** | **Muestra insuficiente**: 2 ciclos resueltos frente a los 20 que los umbrales exigen |

**D1 llega al 100 % por primera vez**, y lo permitió la **fase 35** (PT-175): cierra una subasta de verdad,
así que `R-5.1a` y `R-5.1d` por fin tienen datos.

**D5 al 0 % es la afirmación más importante de esta tabla.** No es que el sistema sea poco fiable: es que
**no se puede afirmar que lo sea**. Subirlo exige volumen de ciclos de pago, no otra corrida igual.

---

## HALLAZGOS

**Activos: 0.** **Cerrados: 28** — H-001 … H-028.

Ninguno se cerró por inferencia: los técnicos, ejecutando; H-005, por decisión humana fechada y con la
declaración de valor enmendada a la vez.

---

## PRODUCTOS: 12

`VALIDADO` **11** · `FUERA_DE_ALCANCE_V1` **1** (`P-012 CfdiRecord`).

`P-012` **no pasa a `VALIDADO`**: el producto no se genera, y marcarlo validado sería falso. Sale del
inventario que v1.0 entrega, con su motivo escrito y su reapertura declarada — si v1.1 vuelve a prometer la
factura, `P-012` vuelve y **H-005 se reabre con él**. `[A6]`: no se degrada ni se borra.

---

## SIGUIENTE

1. **Volumen de ciclos de pago.** Es lo único que sube D5 del 0 %, y con ello la Confianza por encima del
   filo de 91. Hacen falta **20 ciclos resueltos**; hoy hay 2.
2. **La decisión fiscal, cuando haya PAC.** Los tres modelos siguen medidos en
   `evidence/PT-155/hallazgos.md`. La opción C es subconjunto de la B, y la B exige datos que **no se
   pueden pedir retroactivamente**.
3. **Seguir mirando.** Es la conclusión incómoda de la jornada: ocho hallazgos en un día de ejecutar y
   revisar, cinco de ellos viejos. La auditoría no encuentra defectos porque el sistema empeore; los
   encuentra porque alguien mira.

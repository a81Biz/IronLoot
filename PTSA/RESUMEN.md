# PTSA V3 — RESUMEN DE AUDITORÍA
## IronLoot Auction Platform v1.0.0
**Sesión**: S-001 + DS-001 + DS-002 + DS-003 + **DS-004** | **Fecha**: 2026-07-27
**Tipo**: Delta Sync tras 34 días y 20 PT sin reauditar

---

## SCORES ACTUALES (DS-004) — CLASE B

| Métrica | DS-003 (23-jun) | **DS-004 (27-jul)** | Cambio |
|---|---|---|---|
| **Health Score** | 95.2 | **90.5 / 100** | −4.7 |
| **Risk Score** | 44 | **92 / 100** | +48 — **ALTO** |
| **Confidence** | 85 | **62.8 / 100** | −22.2 — **BAJA** |
| **Clasificación** | A | **B** | Bajada |

**Health** = (85×0.30)+(85×0.30)+(100×0.30)+(95×0.10) = **90.5**
**Regla del Agua Potable**: NO activada (D1 = 85 ≥ 60).
**Clasificación sin cap**: A. **Con cap**: **B**.

> **Por qué no es A.** §15.6 es explícito: *«Un Health A con Confidence < 90 NO obtiene
> clasificación A»*. Confidence = 62.8.
>
> La especificación no dice **cuánto** hay que bajar, así que se aplica la clase adyacente (B) y se
> declara que es una interpretación, no una regla literal. Si se quiere otro criterio, hay que
> escribirlo en F-1.
>
> **Nota factual sobre DS-003**: emitió Clase A con Confidence 85, que por esa misma regla tampoco
> alcanzaba A. No se corrige el historial (append-only); se deja constancia.

---

## SCORES POR DIMENSIÓN

| Dimensión | DS-003 | **DS-004** | Hallazgos activos |
|---|---|---|---|
| D1 Alineación de Dominio | 85 | **85** | H-005 (ALTA) — CFDI sin PAC |
| D2 Integridad Arquitectónica | 99 | **85** | **H-008 (ALTA)** — 71 vulnerabilidades |
| D3 Observabilidad y Recuperación | 100 | **100** | ninguno |
| D4 Fidelidad Documental | 100 | **95** | **H-009 (MEDIA)** — docs fuera de git |

**D5** (Confiabilidad Operacional): `NO_APLICA` — sistema determinista, sin LLM.
`health_unstable`: false.

---

## FRESCURA

```
score_freshness:
  last_verified: 2026-07-27
  commits_since_audit: 177
  status: STALE
```

**STALE** por dos motivos independientes: hay commits sobre patrones auditables reauditados sólo en
parte, y el `audit_due` está **vencido** en los cinco productos CRÍTICOS (P-001, P-002, P-004,
P-005, P-009 — vencieron el 23-jul).

---

## LO QUE SE COMPROBÓ, Y CÓMO

Todo por observación directa (`[A5]`): base de datos, `npm`, `git`, código. Nada de segunda mano.

### D1 — Domain Acid Test sobre la salida real (E-010)

`[R55]` exige ejecutarlo sobre la **salida real extraída de la BD**, nunca sobre tests. Se corrió
contra los productos de la corrida completa de QA del 27-jul —pujas reales, subastas cerradas,
**dos pagos por pasarelas de verdad**, retiros y asientos—.

**11 de 12 invariantes cumplen.** Ninguna violación.

| Invariante | |
|---|---|
| Balance nunca negativo · fondos retenidos ≤ balance | ✅ |
| Cada monedero con saldo tiene ledger, **y el último `balance_after` cuadra con el balance** | ✅ 0 descuadres |
| Depósito acreditado == pago del proveedor | ✅ 0 discrepancias |
| Ninguna puja sobre subasta propia · ninguna puja que no supere a la previa | ✅ |
| Moneda MXN exclusivamente · importes `numeric`, **0 columnas float** | ✅ |
| **Todo pago `COMPLETED` tiene su asiento** · **ningún depósito duplicado** | ✅ |
| Registros CFDI | ⚠️ 0 — es H-005 |

Tres de esas comprobaciones no estaban en el catálogo `CR-001…CR-015` y se añadieron porque el
dominio las exige: el cuadre del ledger contra el balance, que todo pago cobrado esté acreditado, y
que ninguna referencia tenga asiento duplicado. Las tres son las garantías que PT-087 introdujo
después de encontrar lo contrario.

> **Limitación, dicha sin adornos**: la muestra es pequeña (3 monederos, 3 pujas, 2 pagos). Son
> productos reales, no simulaciones, pero **no es volumen de producción**. Esto demuestra que los
> invariantes no se violan en el camino observado, **no** que sean imposibles de violar bajo
> concurrencia.

### D3 — Observabilidad, sobre la traza real

9 pasos distintos, 30 eventos. **0 credenciales filtradas.** 4 entradas redactadas, y cada una
**nombra qué ocultó** (`headers.x-signature`, `response.authorization_code`): redacción marcada, no
borrado silencioso.

### D2 y D4 — Lo que bajó el score

`npm audit --omit=dev` → **71 vulnerabilidades** (3 críticas, 53 altas, 15 moderadas) → **H-008**.
Los **cinco documentos** que el alcance declara auditables están **gitignored** → **H-009**.

---

## HALLAZGOS ACTIVOS (3)

| ID | Dim | Sev | Título | Estado |
|---|:--|:--|---|---|
| **H-005** | D1 | ALTA | CFDI/PAC es un stub — sin facturación fiscal | ABIERTA (bloqueado: exige contratar un PAC) |
| **H-008** | D2 | ALTA | 71 vulnerabilidades en producción; `engine.io` alcanzable **sin autenticar** | ABIERTA (nuevo, DS-004) |
| **H-009** | D4 | MEDIA | El alcance declara 5 documentos que git no puede seguir | ABIERTA (nuevo, DS-004) |

Cerrados en sesiones anteriores: H-001, H-002, H-003, H-004, H-006, H-007.

**Ninguno se cerró en esta sesión.** El agente no cierra hallazgos técnicos ni de dominio.

---

## LO QUE ESTA AUDITORÍA NO CUBRE

Declarado para que no se confunda con cobertura:

| Área | Estado |
|---|---|
| **Los 12 productos siguen en `BORRADOR`** | Ninguno llegó nunca a `IDENTIFICADO` ni `VALIDADO`. `[R39]` exige evidencia post-corrección observada en la fuente real para llegar a VALIDADO |
| P-003, P-006, P-007, P-008, P-010, P-011 | Sin salida real auditada en esta sesión → `coverage` = 50 % |
| Explotación de las vulnerabilidades | **No se intentó ninguna.** Se capturó el aviso, la cadena de dependencias y el punto de uso |
| Concurrencia y carga | Fuera del alcance de este delta |
| Nivel 4 del Acid Test (guardrails IA) | `NO_APLICA` — sistema determinista |

---

## RECOMENDACIÓN

1. **H-008 primero, y triando — no `npm audit fix --force`.** Empezar por `engine.io`: es el único
   alcanzable sin credenciales, y da contra la puja en vivo.
2. **Poner a correr el checkpoint D2 de dependencias.** `audit-scope.yaml` lo declara desde el
   23-jun y no hay registro de una sola ejecución. Un checkpoint previsto y no ejecutado es peor
   que no tenerlo: da por cubierta un área que nadie mira.
3. **Decidir sobre H-009**: versionar la documentación crítica, o retirarla del alcance. Hoy el
   alcance promete una cobertura que el repositorio impide.
4. **Subir los productos de `BORRADOR`.** Con el Acid Test de esta sesión, P-001, P-004, P-005 y
   P-009 tienen evidencia real suficiente para pasar a `IDENTIFICADO`. Es trabajo de F3, no de un
   delta sync.

# ROADMAP — FPGE

**Emisión:** R-003 · **2026-07-29** · **Sesión PTSA origen:** S-003 (2026-07-29, delta sync)
**Estado:** todos los ítems en `PROPUESTO`. FPGE propone; **el humano dispone**.

> Tercera emisión, y la segunda de hoy. R-002 se emitió esta mañana **con la compuerta de frescura
> activada** y advirtiendo que el orden no era definitivo hasta un `resume PTSA`. El delta sync se
> corrió, abrió cuatro hallazgos, y esto es el reorden. Los identificadores `R-001`…`R-018` están
> consumidos: los nuevos empiezan en **R-019**.

---

## ✅ Compuerta de frescura: CERRADA

```
score_freshness:  FRESH        last_verified 2026-07-29, commits_since_audit = 0
```

**El orden de abajo sí es fiable.** Es la diferencia entera con R-002: aquella emisión ordenaba sobre
scores que no habían visto once PT ni 91 commits. Ésta ordena sobre una auditoría de hace unas horas.

**Y eso cambia los números, no sólo la confianza.** El `+0.5` de urgencia que R-002 aplicaba «por
dimensión STALE» desaparece, y lo sustituye el `+0.5` **por regresión medida**, que es mejor
evidencia:

| Dimensión | Estado en S-003 | Urgencia |
|---|---|---|
| **D2** | 100 → **80** — regresión | **+0.5** |
| **D4** | 100 → **94** — regresión | **+0.5** |
| **D1** | 85 → 85 — estable | +0 |
| D3 | 100 → 100 — estable | +0 |

**Corrección respecto a R-002**, y conviene decirla: allí apliqué el `+0.5` a *algunos* ítems de D2 y
no a otros. Era incoherente — la urgencia es de la dimensión, no del ítem. Aquí la llevan **todos**
los de D2 y D4, y ninguno de D1. Por eso ítems que no han cambiado en nada suben o bajan.

---

## Lectura rápida

### Top-3 por impacto (`delta_score`)

| # | Ítem | Δ Health | Nota |
|---|---|---|---|
| 1 | **R-019** — H-021, el instrumento que afirma sin medir | **+4.5 real** | Hallazgo activo: retira penalización, no la evita |
| 2 | **R-010** — H-005, quién emite la factura | **+4.5 real** | Idem, pero ningún PT puede cerrarlo |
| 3 | **R-009** — la guarda SSR↔API a ADMIN y BASE | +4.5 evitado | Impide reaparecer un ALTA ya demostrado |

### Top-3 quick wins (esfuerzo `S`, mayor prioridad)

| # | Ítem | Priority |
|---|---|---:|
| 1 | **R-009** | **81.00** |
| 2 | **R-019** | **60.75** |
| 3 | **R-008** | **40.50** |

### Una predicción mía que no se cumplió

Al cerrar el delta sync dije que H-021 *«tiene todos los números para desbancar a R-009»*. **No lo
hace**: 60.75 contra 81.00. Dos cosas que no había hecho al decirlo — H-021 tiene `probabilidad 3`, no
4 (sólo falla desde el contenedor), y R-009 es D1, con multiplicador 1.5. El algoritmo existe
precisamente para que la corazonada no decida.

---

## Orden priorizado

| Rank | ID | Tipo | Título | Origen | Dim | Δ Score | Esf. | **Priority** | Estado |
|---:|---|---|---|---|:--:|---:|:--:|---:|---|
| 1 | **R-009** | REFACTOR | Extender la guarda del contrato SSR↔API a ADMIN y BASE | H-020 | D1 | +4.5 | S | **81.00** | `PROPUESTO` |
| 2 | **R-019** | BUG | `audit:domain` afirma `cross_coherence_verified = true` sin haber medido | **H-021** | D2 | +4.5 | S | **60.75** | `PROPUESTO` |
| 3 | **R-008** | FEATURE | Escáner de vulnerabilidades de la imagen base en CI | TD-016 | D2 | +4.5 | S | **40.50** | `PROPUESTO` |
| 4 | **R-013** | INVESTIGATION | Barrer el patrón de H-019: DTO transformado contra JSON almacenado | H-019 | D2 | +1.5 | S | **27.00** | `PROPUESTO` |
| 5 | **R-012** | BUG | La evidencia que los documentos citan no está en git | F-136-A | D4 | +1.5 | S | **20.25** | `PROPUESTO` |
| 6 | **R-020** | REFACTOR | Los dos checkpoints de delta sync consultan con `docker exec` | **H-022** | D2 | +1.5 | S | **18.00** | `PROPUESTO` |
| 7 | **R-011** | REFACTOR | Impedir que `[START FOUNDATION]` deshaga ADR-049 | PT-141 | D4 | +1.5 | S | **13.50** | `PROPUESTO` |
| 8 | **R-010** | INVESTIGATION | **H-005** — quién emite la factura (CFDI/PAC) | H-005 | D1 | +4.5 | L | **10.13** | `PROPUESTO` |
| 9 | **R-017** | FEATURE | `/users/:id/ratings` exige sesión | S-002-V | D1 | +1.5 | S | **9.00** | `PROPUESTO` |
| 10 | **R-021** | BUG | `audit-scope.yaml` cita cuatro documentos archivados | **H-024** | D4 | +0.5 | S | **6.00** | `PROPUESTO` |
| 11 | **R-016** | REFACTOR | La suite QA por navegador corre sobre HTTP | S-002-V | D2 | +1.5 | M | **4.50** | `PROPUESTO` |
| 12 | **R-018** | BUG | La suite del API no cabe en el contenedor con los workers por defecto | HANDOFF | D2 | +0.3 | S | **1.80** | `PROPUESTO` |
| 13 | **R-014** | REFACTOR | `pages-moderation.js` usa `style.display` | PT-139 | D2 | +0.3 | S | **1.80** | `PROPUESTO` |
| 14 | **R-015** | REFACTOR | La imagen de producción del API lleva dependencias de desarrollo | S-002 | D2 | +0.3 | M | **0.90** | `PROPUESTO` |
| 15 | **R-022** | BUG | `UserResponseDto` publicado con dos esquemas distintos | **H-023** | D4 | +0.1 | S | **0.60** | `PROPUESTO` |

Desempate R-018 / R-014 (1.80, ambos D2): **mayor riesgo de no hacerlo**. Una suite que reporta «4
failed» sin que nada esté roto enseña a descartar sus fallos; el `style.display` de moderación
funciona hoy.

---

## Lo que el algoritmo no sabe, y hay que decir aparte

**R-020 desbloquea la medición.** Sale 6.º con 18.00, y sin embargo **mientras H-022 siga abierto, D1
y D5 no se pueden medir desde donde toca**. La fórmula puntúa *penalización retirada*; no sabe
puntuar *«sin esto, la próxima auditoría vuelve a ser parcial»*. La cobertura de S-003 fue D1 al 50 %
y D5 al 0 %, y eso ya costó 8 puntos de Confidence.

**R-019 y R-020 son el mismo par de ficheros.** Los dos viven en `domain-rules.ts` y
`reliability-check.ts`. Hacerlos juntos es sensiblemente más barato que por separado, y el segundo es
el que permite comprobar que el primero quedó bien — con `docker exec` roto no hay forma de ver
`cross_coherence_verified` calculado sobre datos de verdad. **Si se aprueba uno, aprobar los dos.**

**Y hay una ventana que se cierra sola.** D1 y D5 necesitan una base **con historia**. `run-all.sh`
la genera… y **trunca la base al empezar**. Es lo que se llevó la salida de S-002 y por qué esta
auditoría midió a medias. La secuencia correcta es: arreglar R-020 → correr `run-all.sh` → medir D1 y
D5 **inmediatamente después**. En otro orden no sirve.

---

## Los ítems nuevos, con su racional

### R-019 · BUG · Priority 60.75 · Esfuerzo S · D2 · origen **H-021**

**`audit:domain` imprime `cross_coherence_verified = true` con las cinco comprobaciones en `(ERR)`.**

`Priority = (9 × 4.5 × 1.5 × 1.0) / 1 = 60.75`

- **Evidencia:** E-026. Ejecutado en el contenedor: cinco `(ERR)`, veredicto `true`, **exit 0**.
- **Racional:** no es que falle — es que **afirma sin haber medido**, dentro del instrumento que la
  auditoría usa para medir. Las cinco comprobaciones cubren dinero: importe del pedido contra precio
  final, comisión contra importe, registro de comisión contra el asiento del ledger.
- Lo más útil de este ítem es que **la solución ya está escrita tres líneas más arriba**: el mismo
  script devuelve `rubric_compliance_score = null` con el texto *«Esto NO es un 100: es una auditoría
  que no ha podido mirar»*. Sólo hay que aplicar el mismo criterio al veredicto de al lado: derivarlo
  del resultado, y **no salir con 0** cuando no se pudo medir.
- **Riesgo de no hacerlo:** cualquier delta sync futuro lee esa línea y concluye que la coherencia
  entre productos está verificada. Quinta aparición del patrón de la casa, agravada porque **no calla:
  dice que sí**.

### R-020 · REFACTOR · Priority 18.00 · Esfuerzo S · D2 · origen **H-022**

**Los dos checkpoints de delta sync consultan con `docker exec psql`.**

`Priority = (8 × 1.5 × 1.5 × 1.0) / 1 = 18.00`

- **Evidencia:** E-026 — `domain-rules.ts:268` y `reliability-check.ts:55`.
- **Racional:** dentro del contenedor no hay binario `docker`. **PT-138 corrigió exactamente esto** en
  el tercer script pasándolo a `PrismaClient.$queryRawUnsafe`; los otros dos se quedaron con la forma
  vieja y nada lo notó. Quien siga la convención de CLAUDE.md —«npm se ejecuta en el contenedor»—
  obtiene `SIN_DATOS` sin ninguna pista de por qué. Y los dos salen con **código 0**.
- **La corrección ya tiene modelo dentro del repositorio**, que es lo que la hace S.
- **Ver arriba:** desbloquea la medición de D1 y D5. Su valor real está por encima de su puesto.

### R-021 · BUG · Priority 6.00 · Esfuerzo S · D4 · origen **H-024**

**`audit-scope.yaml` cita cuatro documentos que archivó PT-141, y describe mal las migraciones.**

`Priority = (8 × 0.5 × 1.5 × 1.0) / 1 = 6.00`

- **Evidencia:** E-027. Cuatro de cinco rutas de `docs:` rotas. Y `# 23 migraciones — ninguna se ha
  ejecutado nunca` es falso dos veces: son **2** y **las dos están aplicadas**.
- **Racional:** el fichero que declara **qué se audita** declara una cobertura que no tiene, y `[A8]`
  hace de la cobertura declarada un requisito del score. Familia de H-016.
- **Lo introdujo el trabajo de ayer** (PT-141), que sí siguió las citas de `CLAUDE.md` y la guarda del
  TRD y no siguió ésta. Se prioriza igual que cualquier otro.
- **Sugerencia de alcance**: es la tercera vez que el patrón aparece (H-016, PT-130, esto).
  Considerar que **el alcance de auditoría se verifique solo**, como ya se verifican las citas del
  TRD, en vez de reapuntar cuatro rutas y esperar.

### R-022 · BUG · Priority 0.60 · Esfuerzo S · D4 · origen **H-023**

**`UserResponseDto` publicado con dos esquemas distintos.**

`Priority = (4 × 0.1 × 1.5 × 1.0) / 1 = 0.60`

- **Evidencia:** E-028 — `warn` en cada arranque.
- **Racional:** último de la lista y aun así merece existir, porque **trae fecha de caducidad puesta
  por la propia librería**: *«will throw an error in the next major version»*. El día que alguien
  suba de mayor, el arranque deja de completarse, y será «se rompió al actualizar» en vez de «lo
  sabíamos».

---

## Los once de R-002 siguen vigentes

No se repite aquí su racional: está íntegro en `ROADMAP_HISTORY.log` (Run FPGE-002) y su evidencia se
verificó contra el código esta misma mañana. Lo único que cambia son sus `Priority`, por el ajuste de
urgencia explicado arriba:

| Ítem | R-002 | **R-003** | Por qué |
|---|---:|---:|---|
| R-009 | 121.50 | **81.00** | D1 pasa de «STALE» a estable: pierde el `+0.5` |
| R-010 | 15.19 | **10.13** | Igual |
| R-008 · R-013 · R-012 · R-011 · R-017 | — | **sin cambio** | Ya llevaban la urgencia correcta |
| R-016 | 3.00 | **4.50** | D2 en regresión: gana el `+0.5` que R-002 no le dio |
| R-018 · R-014 | 1.20 | **1.80** | Igual |
| R-015 | 0.60 | **0.90** | Igual |

---

## No compiten en el algoritmo

| Qué | Quién | Nota |
|---|---|---|
| **Correr `run-all.sh` y medir D1/D5 justo después** | Agente | Trabajo PTSA. **Después de R-020**, o volverá a medirse a medias |
| **PT-141.B — `[START FOUNDATION]`** | Humano decide cuándo | Ver **R-011** antes |
| **PT-035 · T-035.12** | Humano | Validación visual, no automatizable |
| **CFDI/PAC (TD-001)** · **Stripe y HeyBanco (TD-002)** | Humano | Contratos y credenciales externas |
| **`git push origin master`** | Humano | 11 commits locales sin subir |

**Ya no hay VoBo pendientes.** Los once PT de la tanda se cerraron hoy: nueve `CLOSED` con validación
humana, dos `DONE`. Era el bloque más grande de R-002 y ha desaparecido.

---

## Cómo leer los números

`Priority = (EvidenceWeight × ScoreImpact × Urgency × DomainMultiplier) / Effort`

| Factor | De dónde sale |
|---|---|
| `EvidenceWeight` | Impacto × Probabilidad del hallazgo. Sin hallazgo: **6** hueco medido en un control, **4** menor medido |
| `ScoreImpact` | Penalización (30/15/5/1) × peso de dimensión (D1/D2/D3 = 0.30, D4 = 0.10) |
| `Urgency` | 1.0 base · `+0.5` si `audit_due` vencido (**ninguno lo está**) · `+0.5` si la dimensión **regresa** — hoy D2 y D4 |
| `DomainMultiplier` | 1.5 en D1 (R-009, R-010, R-017) |
| `Effort` | S=1 · M=2 · L=4 |

**El ajuste declarado de R-002 sigue vigente y ahora aplica a menos ítems.** `ScoreImpact` es
*penalización removida*; para lo que aún no está penalizado se usa **penalización evitada**, marcada
como tal. En R-002 eso valía para diez de once ítems. Aquí sólo para once de quince: **los cuatro
nuevos nacen de hallazgos activos**, así que su ganancia es real.

**Ningún tope silencioso:** los quince candidatos aparecen los quince.

---

## Siguiente paso

1. Marcar cada ítem `APROBADO` / `DIFERIDO` / `DESCARTADO`.
2. Por cada `APROBADO`: `promote FPGE R-XXX` → PT nuevo en FDGE STATE 1
   (`BUG`→1-B · `FEATURE`→1-E · `REFACTOR`→1-R · `INVESTIGATION`→1-B modo investigación).
3. **Si se aprueba R-019, aprobar R-020 con él** — mismos ficheros, y el segundo es lo que permite
   comprobar el primero.

FPGE **se detiene aquí**. No promueve nada por sí mismo.

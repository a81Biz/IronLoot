# PTSA V3 — RESUMEN DE AUDITORÍA
## IronLoot Auction Platform v1.0.0

**Sesión**: S-015 — **delta sync** | **Fecha**: 2026-07-31
**Disparador**: `resume PTSA`, tercer paso de la secuencia `run-all.sh` → suite de navegador →
`resume PTSA`.
**auditoria_estado**: CERRADA_CON_HALLAZGO_ACTIVO

---

## SCORES — CLASE A

| Métrica | S-013 | **S-015** | Cambio |
|---|---|---|---|
| **Health Score** | 100 | **95.5 / 100** | **−4.5** |
| **Risk Score** | 0 | **32 / 100** | +32 |
| **Confidence** | 91.0 | **95.0 / 100** | **+4.0** |
| **Clasificación** | A | **A** | — |

```
Health = (100×0.30) + (85×0.30) + (100×0.30) + (100×0.10) = 95.5
Risk   = min(100, (4×2) × 4) = 32            Risk_bruto = 8 — un hallazgo ALTA activo
Conf   = 90×0.40 + 100×0.25 + 95×0.20 + 100×0.15 = 95.0
```

**Regla del Agua Potable: NO activada.** D1 = 100. Se dice porque `[A4]` lo exige.

> ## El Health baja, y eso es la mejora
>
> Cuatro sesiones seguidas emitiendo **100 con cero hallazgos activos** medían, sobre todo, **que nadie
> había ejecutado la suite de navegador**. Hoy se ejecutó, y encontró `H-042` en el camino del dinero.
>
> Un certificado que baja cuando aparece un defecto conocido está haciendo su trabajo. El 100 anterior no
> era un sistema mejor: era el mismo sistema con menos gente mirando.
>
> **Y la Confianza sube al mismo tiempo** —91.0 → 95.0—, que es lo que tiene que pasar: se sabe **más**
> sobre el sistema, y parte de lo que se sabe es un defecto.

---

## SCORES POR DIMENSIÓN

| Dimensión | S-013 | **S-015** | Penaliza hoy |
|---|---|---|---|
| D1 Alineación de Dominio | 100 | **100** | — |
| D2 Integridad Arquitectónica | 100 | **85** | `H-042` (ALTA, −15) |
| D3 Observabilidad y Recuperación | 100 | **100** | — |
| D4 Fidelidad Documental | 100 | **100** | — |

**D5**: `SIN_DATOS` por muestra insuficiente — **3 ciclos frente a 20**. `health_unstable: false`.
Alucinación y drift `NO_APLICA` (sistema determinista).

---

## LOS CINCO CHECKPOINTS, EJECUTADOS

Por primera vez desde S-005, los dos de delta sync corren **con una base con historia**, generada por
`run-all.sh` en esta misma sesión:

| Checkpoint | Resultado |
|---|---|
| `audit:schema` (D2) | **OK** — las migraciones reproducen `schema.prisma` |
| `audit:check` (D2) | **OK** — 0 avisos; la línea base está vacía a propósito |
| `audit:observability` (D3) | **OK** — sin silencios nuevos · `trace_completeness = 100 %` |
| `audit:domain` (D1.N1) | **14 de 14 reglas OK** · `rubric_compliance_score = 100` |
| `audit:reliability` (D5) | `SIN_DATOS` — muestra insuficiente |

**`cross_coherence_verified = sin_datos`, y eso NO es un aprobado.** 4 de 5 comprobaciones midieron y
salieron OK; la quinta —«toda disputa cuelga de un pedido»— **no tenía filas que comparar**, porque la
suite no abre ninguna disputa. El instrumento se niega a pronunciarse: es lo que PT-149 construyó.

---

## EL HALLAZGO

### `H-042` — un webhook con firma fabricada obtuvo `SIGNATURE_OK` · **ALTA · ABIERTA**

`QA-PP-15` falló con `HTTP 400` en **las tres corridas** de la suite. Reproducido a mano: con las cinco
cabeceras presentes y la firma `ZmFsc2E=`, el log del API encadena

```
Received PayPal webhook CHECKOUT.ORDER.APPROVED (WH-FALSO)
Capturing PayPal order X                    ← ya está capturando
PayPal respondio 404                        ← sólo falla porque el pedido no existe
```

y la traza registra **`SIGNATURE_OK`**.

**Lo único que detuvo el flujo fue un 404 ajeno**, no la comprobación que `RN-50` exige.

**Se deja ABIERTA a propósito.** `verifyWebhookSignature` sí se llama antes de capturar y sí consulta el
endpoint de PayPal: lo que falta por medir es **por qué respondió `SUCCESS`**. Tres hipótesis sin
separar —permisividad del sandbox, cuerpo mal formado, `PAYPAL_WEBHOOK_ID` que no corresponde—, y ninguna
se cierra escribiendo código. Asignado a **`PT-234`** como INVESTIGATION.

**No lo introdujo la tanda de hoy:** `git diff master -- src/api/src/modules/payments/` está vacío.

---

## LO QUE LA SUITE ENCONTRÓ Y 1.441 PRUEBAS UNITARIAS NO

Dos **regresiones de la tanda `PT-204`…`PT-233`**, corregidas en el acto:

1. **`{{ self.title() }}`** en el layout de BASE — sintaxis de **Jinja2**, que Nunjucks no implementa.
   **500 en todas las páginas públicas.** Pasó `tsc`, ESLint y las 1.441 pruebas.
2. **Desbordamiento de 4 px a 768 px**, reproducible **sólo en modo `headed`**: PT-226 añadió un tercer
   enlace al menú y con la barra de desplazamiento la fila deja de caber. El umbral del menú móvil pasa
   de 640 a 820 px, medido.

Y **dos fallos de la propia suite**, que probaba una versión anterior del producto: no marcaba la casilla
de consentimiento que `PT-219` hizo obligatoria, y por eso `bootstrap` daba 2/12 con todo lo demás
`BLOCKED` por «login falló» — un síntoma que no se parece en nada a su causa.

**Ninguna herramienta estática puede ver que una plantilla no renderiza.** Es `H-038` cobrado el mismo
día en que se registró.

---

## COBERTURA DECLARADA — `[A8]`

| Dimensión | S-013 | **S-015** | Por qué |
|---|---:|---:|---|
| D1 Dominio | 50 % | **100 %** | 14 de 14 reglas sobre **salida generada en esta sesión**, no sobre datos preexistentes |
| D2 Integridad | 100 % | **100 %** | Esquema verificado contra la base y contra el modelo; 0 vulnerabilidades |
| D3 Observabilidad | 100 % | **100 %** | Silencios en línea base · `trace_completeness` 100 % sobre 2 ciclos reales |
| D4 Documental | 100 % | **100 %** | 20 guardas de documentación en verde |
| **D5 Fiabilidad** | 0 % | **0 %** | **3 ciclos frente a 20.** Sigue siendo lo único que impide `coverage = 100` |

Suite completa al cerrar: **1.441 pruebas / 161 suites** (API 1.140 · CLIENT 172 · CORE 93 · BASE 23 ·
ADMIN 13). Suite de navegador: **209 de 210** comprobaciones, el único fallo es `QA-PP-15` = `H-042`.

---

## HALLAZGOS

**Activos: 1** (`H-042`). **Cerrados: 41** — `H-001` … `H-041`.

`H-038`…`H-041`, registrados en `S-014`, recogen los 64 hallazgos de la auditoría de interfaz como cuatro
familias —una por causa, no una por síntoma— y nacieron `CERRADA` por la tanda `PT-204`…`PT-233`.

---

## PRODUCTOS: 12

`VALIDADO` **11** · `FUERA_DE_ALCANCE_V1` **1** (`P-012 CfdiRecord`).

`P-004 Payment` **conserva `VALIDADO`**: `H-042` es un defecto del camino de verificación, no de la
salida del producto — los 3 ciclos medidos cuadran y ningún depósito se acreditó dos veces (`R-5.1c`).
Se dice porque la tentación de degradarlo existe y sería inexacto.

---

## SIGUIENTE

1. **`PT-234` — `H-042`.** Es el único hallazgo activo y está en el camino del dinero. Su Discovery tiene
   que **separar las tres hipótesis midiendo**, no elegir una.
2. **Volumen de ciclos de pago.** Único camino para sacar D5 del 0 % y la Confianza por encima de 95.
   Hacen falta 20 ciclos resueltos; hoy hay 3.
3. **Una disputa en la suite.** Es la única de las cinco coherencias inter-producto que no pudo medirse,
   y basta con que una fase abra una.
4. **Y la lección de hoy, aplicada:** la suite de navegador encontró en una corrida lo que 1.441 pruebas
   unitarias no ven. **Ejecutarla no es opcional antes de emitir un certificado** — es la diferencia
   entre medir el producto y medir sus piezas.

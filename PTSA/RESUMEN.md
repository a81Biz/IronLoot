# PTSA V3 — RESUMEN DE AUDITORÍA
## IronLoot Auction Platform v1.0.0

**Sesión**: S-004 + **S-004-M** (medición dirigida D1/D5) | **Fecha**: 2026-07-29
**Disparador**: petición explícita del humano tras cerrar con VoBo PT-166…PT-172. 32 commits y
veinticinco PT (PT-148…PT-172) desde el último delta sync (`d260c80`).
**auditoria_estado**: CERRADA_CON_HALLAZGOS

---

## SCORES — CLASE B

| Métrica | S-003 | S-004 | **S-004-M** | Cambio neto |
|---|---|---|---|---|
| **Health Score** | 88.9 | 89.5 | **88.0 / 100** | −0.9 |
| **Risk Score** | 100 | 100 | **100 / 100** | = — saturado |
| **Confidence** | 87.0 | 83.6 | **97.9 / 100** | **+10.9** |
| **Clasificación** | B | B | **B** | = |

```
Health = (85×0.30) + (85×0.30) + (90×0.30) + (100×0.10) = 88.0
Risk   = min(100, 34 × 4) = 100         Risk_bruto = 6 + 12 + 8 + 8 = 34
Conf   = 97.2×0.40 + 100×0.25 + 95×0.20 + 100×0.15 = 97.9
```

**Regla del Agua Potable: NO activada.** D1 = 85 ≥ 60. Se dice explícitamente porque `[A4]` lo exige:
el dominio no está capando nada.

**§15.6 ya no ata.** La Confianza —**97.9**— supera de sobra el ≥ 90 que exige para clasificar A. Lo que
falta son **2 puntos de Health**, y los tienen los cuatro hallazgos activos. **Es la primera vez que la
clase depende sólo de defectos y no de lo que la auditoría no pudo mirar.** `freshness = FRESH` → sin cap.
`health_unstable = false` → sin cap por D5, y ahora **con datos detrás**.

---

## SCORES POR DIMENSIÓN

| Dimensión | S-003 | S-004 | **S-004-M** | Penaliza hoy |
|---|---|---|---|---|
| D1 Alineación de Dominio | 85 | 85 | **85** | H-005 (ALTA) — CFDI sin decidir |
| D2 Integridad Arquitectónica | 80 | 85 | **85** | H-025 (ALTA) — el veredicto no compara filas |
| D3 Observabilidad y Recuperación | 100 | 95 | **90** | H-026 (MEDIA) · H-027 (MEDIA) |
| D4 Fidelidad Documental | 94 | 100 | **100** | — |

**D5**: **MEDIDO por primera vez** — Success 100 % · Retry 0 % · Failure 0 %, sobre 3 ciclos (1 resuelto).
Alucinación y drift `NO_APLICA` (sistema determinista). `health_unstable: false`, ahora por datos y no por
ausencia de ellos.

---

## LO QUE PASÓ ENTRE S-003 Y S-004

**Los cuatro hallazgos de S-003 están corregidos y cerrados**, y se verificaron **ejecutando**, no
leyendo: `audit:domain` da `verificado` con 5/5 y **sale con 1** cuando no puede conectar (H-021);
los dos checkpoints de delta sync corren dentro del contenedor (H-022); el `warn` del DTO duplicado da
**0** ocurrencias (H-023); las rutas del alcance existen y RULE-28 lo vigila (H-024).

**Y aparecieron cinco defectos que ningún hallazgo PTSA cubría** — los encontró la revisión de coherencia
que pidió el humano, no un mecanismo. Los cerró la tanda PT-168…PT-172, con tres reglas nuevas
(RULE-33, 34, 35) y una guarda ampliada (RULE-31). El resumen honesto de esa tanda: **el código estaba
bien; lo que mentía era lo que el repositorio decía de sí mismo.**

D4 vuelve a **100** por eso.

---

## LO QUE ENCONTRÓ ESTA CORRIDA

**Tres hallazgos nuevos, los tres de la misma familia**: instrumentos que no distinguen «comprobé» de «no
pude comprobar». Dos los encontró el delta sync (S-004); el tercero, la medición dirigida (S-004-M) al leer
el resumen de la propia suite que le generó los datos.

### H-025 (ALTA, D2) — el veredicto de coherencia, verde sin comparar filas

`audit:domain` cierra su Nivel 3 con `cross_coherence_verified = verificado`, «5 de 5 medidas, 0
incoherentes». **La base tiene cero pedidos, cero pagos, cero comisiones y cero asientos.** Las cinco
consultas corrieron limpias y devolvieron «0 incoherencias» porque **no había una sola fila que
comparar**.

Es **H-021 con otra ropa, y la sexta aparición del patrón de la casa.** PT-149 arregló el caso «no pude
conectar» y dejó el caso «no había datos». Y el propio docstring de `veredictoCoherencia()` **declara la
protección que el código no implementa**: *«un catálogo vacío da `sin_datos`, no `verificado`»*.

Las cinco comprobaciones cubren dinero. Un delta sync que lea esa línea concluye que el dinero es
coherente sin que se haya comparado un peso — **y es lo que esta corrida habría concluido** si no se
hubiera cruzado con el conteo de filas.

Agravante: **cuanto más vacía está la base, más verde sale.** Es la propiedad inversa de la que debe
tener un instrumento de auditoría.

**Y S-004-M lo reforzó.** Con la base **poblada** —3 usuarios, 12 asientos, 3 ciclos, 19 eventos de traza—
el veredicto sigue diciendo `verificado · 5 de 5 medidas`, y **cuatro de las cinco comprobaciones
compararon cero filas** (0 pedidos, 0 comisiones, 0 disputas; sólo el tipo de aviso tenía 2 filas). Es
evidencia más fuerte que la de la base vacía: allí podía parecer un límite del entorno.

### H-026 (MEDIA, D3) — Redis no se puede observar

`/api/v1/health/detailed` devuelve `degraded` **siempre**: `redis` vale `unknown` con el mensaje *«Redis
check not implemented»*, y como `allUp` nunca es cierto, el endpoint **no puede** devolver `healthy`.

Reporta un problema que no existe en cada consulta —ruido que enseña a descartar la fuente— y, lo que
importa, **si Redis se cayera de verdad diría exactamente lo mismo**. Una caída real es indistinguible
del funcionamiento normal en el único endpoint que existe para diagnosticarla.

De Redis dependen las colas, el rate limiting, el cerrojo distribuido y las sesiones de ADMIN. RULE-17
protegió el **arranque**; la degradación **en caliente** quedó sin cubrir.

MEDIA y no ALTA porque **nada depende del endpoint roto**: el `healthcheck` de Docker usa
`/api/v1/health`, que responde 200, y `database` sí se comprueba de verdad.

### H-027 (MEDIA, D3) — el resumen de la suite omite la fase que falla

La corrida de S-004-M terminó con **nueve fases, todas PASS**. El runner ejecuta **diez**: la
`Fase 71 — PAGO REAL POR PAYPAL VIA GARANTIZADA` falló con `TimeoutError` y **no aparece en ninguna línea
del resumen**. `run-all.sh:73-76` lo construye con `[ -f "$f" ] && echo …`, así que una fase que muere no
escribe su `.json` y **se salta sin decir nada**.

El fallo en sí lo causa la UI de sandbox de PayPal —un tercero, y se declara como límite de cobertura—.
**El hallazgo es que el resumen no lo dice**: «la fase no existe», «la fase pasó» y «la fase se cayó» se
ven idénticas. El log lo menciona sesenta líneas antes, enterrado en una traza de Playwright.

Lo que quedó sin verificar es **la vía garantizada de PayPal**, y es donde más importa: en Orders v2
**aprobar no mueve el dinero**, así que su vía garantizada **captura**. Séptima aparición del patrón de la
casa, esta vez **por omisión**: no miente, calla. Familia directa de H-015.

### Un falso hallazgo, descartado antes de escribirlo

`ledger_entries` no existe — la tabla se llama `ledger`. La primera consulta falló con
`relation does not exist`, que sobre una tabla de contabilidad tiene la forma exacta de un hallazgo
grave. Se comprobó en `information_schema` antes de concluir nada. Queda constancia porque el hallazgo
habría sido **falso**, igual que los doce eventos de traza «huérfanos» que S-003 descartó.

### Y un fallo de checkpoint que NO es hallazgo

`audit:schema` falló con `P1003`: la base sombra `ironloot_db_shadow_check` no existe. **El instrumento se
comporta bien** —no dice OK, nombra la causa y sale con 1— y el job `schema-drift` de CI **crea la base
explícitamente** (lo descubrió PT-136 ejecutando). El checkpoint funciona donde está declarado; lo que
falta es esa base en el entorno local. Creada a mano, el veredicto real: **las migraciones reproducen
`schema.prisma`.**

---

## COBERTURA DECLARADA — `[A8]`

| Dimensión | Cobertura | Por qué |
|---|---:|---|
| D2 Integridad | 100 % | Esquema verificado en la base **y contra el modelo**, vulnerabilidades contra línea base, CI leído |
| D3 Observabilidad | 100 % | Logs vivos, silencios, endpoints consultados, `trace_completeness` **100 %** |
| D4 Documental | 100 % | 12 guardas de documentación, 134 pruebas |
| **D1 Dominio** | **86 %** | **12 de 14 reglas medidas, las 12 cumplen.** En S-004 fue 1 de 14 |
| **D5 Fiabilidad** | **100 %** | **Medido por primera vez.** Muestra: 3 ciclos, 1 resuelto |

**El hueco de cobertura se cerró, y eso vale 14.3 puntos de Confianza.** `run-all.sh` generó salida real
—3 usuarios, 1 subasta, 3 pujas, 1 pago, 3 ciclos, 12 asientos, 19 eventos de traza, 2 retiros— y **se
midió en la misma sesión**, sin cortar. La salida de S-002 y la de S-003 se perdieron por medir en la
sesión siguiente; dos veces es un patrón, y esta vez se evitó.

**Lo que falta de D1 son dos reglas, y el bloqueo es de la suite:** `R-5.1a` y `R-5.1d` necesitan una
subasta **cerrada**, y hay 0 en `CLOSED` porque la suite no espera los 120 s de la ventana. Salen `n/d`, no
`VIOLADA` — se comprobó antes de concluir.

**Y un límite declarado:** la **vía garantizada de PayPal no se ejerció**. Su fase falló por la UI de
sandbox de un tercero, y el resumen no lo dijo — ver **H-027**.

---

## HALLAZGOS

**Activos: 4** — H-005 (D1, ALTA) · H-025 (D2, ALTA) · H-026 (D3, MEDIA) · H-027 (D3, MEDIA).
**Cerrados: 23** — H-001 … H-004, H-006 … H-024.

**Ninguno de los tres nuevos lo cierra el agente** — `[R44]`. Los tres son de tipo BUG/OBSERVABILITY y
requieren corrección bajo FDGE y validación humana. **Los tres son corregibles sin depender de nadie de
fuera**, al contrario que H-005.

### Por qué el Risk marca 100

`Risk = min(100, Risk_bruto × 4)`, con `Risk_bruto = 34`. Se satura a partir de 25.

**Lo empuja la certeza, no la gravedad**: los cuatro activos tienen probabilidad alta porque son
deterministas —el veredicto no distingue en ninguna corrida, el endpoint dice `degraded` en cada consulta,
el resumen omite cualquier fase que falle, y el CFDI no se emite nunca—. Dos son ALTA, dos MEDIA, y
**ninguno es CRÍTICA**. Se reporta como sale y se explica al lado.

---

## PRODUCTOS: 12

`VALIDADO` **11** · `IDENTIFICADO` **1** (P-012 `CfdiRecord`, bloqueado por H-005).

**Ninguno cambia de estado.** Se validaron con evidencia observada (E-025) y `[A6]` los protege; que hoy
no haya datos para revalidarlos no los degrada — pero tampoco cuenta como cobertura de S-004.

---

## EVIDENCIAS NUEVAS

**E-029** — los cinco checkpoints ejecutados · **E-030** — la base real contada · **E-031** — la salud
leída en vivo.

---

## SIGUIENTE

1. **H-025, H-026 y H-027 a FDGE.** Los tres son corregibles y ninguno depende de terceros. H-025 es ALTA
   y vive dentro del instrumento que esta auditoría usa para medir.
2. **Ampliar la suite QA para que cierre una subasta.** Cerraría las dos reglas de D1 que faltan
   (`R-5.1a`, `R-5.1d`) y daría filas reales a las cuatro comprobaciones de coherencia que hoy comparan
   cero — que es la mitad de lo que hace grave a H-025.
3. **H-005** — decisión de negocio y fiscal. Sigue siendo el único hallazgo que ningún PT puede cerrar.

> **Lo que esta sesión demuestra sobre el método:** medir en la misma sesión que genera los datos subió la
> Confianza de 83.6 a 97.9 y permitió evaluar D5 por primera vez. Las dos veces anteriores se midió en la
> sesión siguiente y la salida ya no estaba.

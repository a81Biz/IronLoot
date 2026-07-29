# PTSA V3 — RESUMEN DE AUDITORÍA
## IronLoot Auction Platform v1.0.0

**Sesión**: S-004 — **delta sync** (`resume PTSA`) | **Fecha**: 2026-07-29
**Disparador**: petición explícita del humano tras cerrar con VoBo PT-166…PT-172. 32 commits y
veinticinco PT (PT-148…PT-172) desde el último delta sync (`d260c80`).
**auditoria_estado**: CERRADA_CON_HALLAZGOS

---

## SCORES — CLASE B

| Métrica | S-003 (29-jul) | **S-004 (29-jul)** | Cambio |
|---|---|---|---|
| **Health Score** | 88.9 | **89.5 / 100** | +0.6 |
| **Risk Score** | 100 | **100 / 100** | = — saturado |
| **Confidence** | 87.0 | **83.6 / 100** | −3.4 |
| **Clasificación** | B | **B** | = |

```
Health = (85×0.30) + (85×0.30) + (95×0.30) + (100×0.10) = 89.5
Risk   = min(100, 26 × 4) = 100         Risk_bruto = 6 + 12 + 8 = 26
Conf   = 61×0.40 + 100×0.25 + 95×0.20 + 100×0.15 = 83.6
```

**Regla del Agua Potable: NO activada.** D1 = 85 ≥ 60. Se dice explícitamente porque `[A4]` lo exige:
el dominio no está capando nada.

**§15.6 ata por dos vías esta vez.** Para clasificar A hacen falta Health ≥ 90 **y** Confidence ≥ 90;
el Health se queda en **89.5** —a medio punto— y la Confianza en **83.6**. `freshness = FRESH` → sin cap
por frescura. `health_unstable = false` → sin cap por D5.

---

## SCORES POR DIMENSIÓN

| Dimensión | S-003 | **S-004** | Penaliza hoy |
|---|---|---|---|
| D1 Alineación de Dominio | 85 | **85** | H-005 (ALTA) — CFDI sin decidir |
| D2 Integridad Arquitectónica | 80 | **85** | H-025 (ALTA) — el veredicto de coherencia sobre cero filas |
| D3 Observabilidad y Recuperación | 100 | **95** | H-026 (MEDIA) — Redis no se puede observar |
| D4 Fidelidad Documental | 94 | **100** | — |

**D5**: `SIN_DATOS` — cero ciclos de pago en la base. Alucinación y drift `NO_APLICA` (sistema
determinista). `health_unstable: false`.

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

Dos hallazgos nuevos, los dos de la misma familia: **instrumentos que no distinguen «comprobé» de «no
pude comprobar»**.

### H-025 (ALTA, D2) — el veredicto de coherencia, verde sobre una base vacía

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
| D2 Integridad | 100 % | Esquema verificado en la base, vulnerabilidades contra línea base, CI leído |
| D3 Observabilidad | 100 % | Logs vivos, checkpoint de silencios, endpoints consultados |
| D4 Documental | 100 % | 12 guardas de documentación, 134 pruebas |
| **D1 Dominio** | **7 %** | **1 de 14 reglas medidas.** En S-003 fueron 7 de 14 |
| **D5 Fiabilidad** | **0 %** | Cero ciclos de pago que evaluar |

**La cobertura de D1 empeoró a la mitad de la mitad, y no es por el código: la base se quedó
completamente vacía** — 0 usuarios, donde S-003 contaba 4. Otro reseteo. Es la única razón de que la
Confianza baje 3.4 puntos en una corrida que cerró cuatro hallazgos.

**Los tres bloqueos se resuelven igual:** una corrida `run-all.sh` genera salida real, y **hay que medir
D1 y D5 inmediatamente después**, antes de que otro reseteo se la lleve. `run-all.sh` trunca la base al
empezar, y es lo que se llevó la salida de S-002 y la de S-003.

---

## HALLAZGOS

**Activos: 3** — H-005 (D1, ALTA) · H-025 (D2, ALTA) · H-026 (D3, MEDIA).
**Cerrados: 23** — H-001 … H-004, H-006 … H-024.

**Ninguno de los dos nuevos lo cierra el agente** — `[R44]`. Los dos son de tipo BUG/OBSERVABILITY y
requieren corrección bajo FDGE y validación humana.

### Por qué el Risk marca 100

`Risk = min(100, Risk_bruto × 4)`, con `Risk_bruto = 26`. Se satura a partir de 25, así que lo hace **por
un punto**.

**Lo empuja la certeza, no la gravedad**: los tres activos tienen probabilidad alta porque son
deterministas —el veredicto sale verde en cada corrida sobre la base vacía, el endpoint dice `degraded`
en cada consulta, y el CFDI no se emite nunca—. Sólo dos son ALTA además de ciertos, y ninguno es
CRÍTICA. Se reporta como sale y se explica al lado.

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

1. **H-025 y H-026 a FDGE.** Los dos son corregibles y ninguno depende de terceros.
2. **Una corrida `run-all.sh` y medir D1 y D5 justo después.** Es lo único que puede subir la Confianza,
   y la ventana es estrecha.
3. **H-005** — decisión de negocio y fiscal. Sigue siendo el único hallazgo que ningún PT puede cerrar.

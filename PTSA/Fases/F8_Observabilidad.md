# F8 — Auditoría de Observabilidad y Recuperación

**Estado**: COMPLETADA (parcial — BLQ-002: sin logs en vivo)  
**Fecha**: 2026-06-23  
**Confidence**: 70%  
**Dimensión principal**: D3 — Observability & Recovery  
**D5 — Operational Reliability**: Parcialmente evaluado; Hallucination Rate y Output Drift → **NO_APLICA** (sistema determinista)

---

## Limitaciones

**BLQ-002**: No hay acceso a logs en vivo ni métricas de sistema. La evaluación de observabilidad se realiza únicamente mediante lectura del código fuente y configuración. La confidence de D3 es reducida por este blockeador.

---

## F8.1 — Stack de Logging

### StructuredLogger (módulo de observabilidad)
**Fuente**: `src/api/src/common/observability/constants.ts`, `06-Backend-Architecture.md`

El API implementa un sistema de logging estructurado con:
- `StructuredLogger`: wrapper sobre el logger de NestJS con soporte para `traceId`, `requestId`, child loggers
- Integrado en: `BidsService`, `WalletService`, `AuthService`, `AuctionSchedulerService` (verificado via código)
- Formato: JSON estructurado con contexto de correlación

**Cobertura de StructuredLogger**: Alta en servicios financieros críticos.  
**Excepción conocida**: `PaymentsService` — H-003 (Logger estándar, D2-BAJA)

### RequestLog / AuditEvent / ErrorEvent
**Fuente**: `06-Backend-Architecture.md` sección Observability Stack  
**Documentado**: Tres tipos de evento en el módulo `audit`:
- `RequestLog`: cada request HTTP → tabla `request_logs`
- `AuditEvent`: eventos de negocio importantes → tabla `audit_events`  
- `ErrorEvent`: errores capturados → tabla `error_events`

**Estado**: Documentado en arquitectura. No verificado en código fuente directo (requeriría leer AuditService y middleware correspondiente — no hecho en esta sesión).  
**Confidence de este sub-ítem**: 70%

---

## F8.2 — Trazabilidad End-to-End

### TraceId propagation
**Estado ESPERADO**: `traceId` propagado desde request inicial a través de todos los servicios via `StructuredLogger`.  
**Estado REAL verificado**:
- BidsService, WalletService, AuthService: StructuredLogger (trazabilidad ✅)
- PaymentsService: Logger estándar — traceId ausente en logs de pagos ❌ (H-003)

La cadena de trazabilidad está rota específicamente en el módulo de pagos, que es el más crítico para diagnóstico de incidentes financieros.

---

## F8.3 — Health Checks

**Fuente**: `docs/enterprise-documentation/inventory/endpoints.md` + arquitectura  
**Endpoints documentados**:
- `GET /health` — health básico
- `GET /health/detailed` — health detallado con estado de dependencias (DB, Redis)

**Estado**: Documentado. No verificado via llamada real (BLQ-002).  
**Confidence**: 75%

---

## F8.4 — Recovery y Fallbacks

### Distributed lock para auction close
`lock:auction-close` con TTL 60s → previene doble-close si múltiples instancias compiten  
**Estado**: ✅ IMPLEMENTADO (verificado en código)

### Admin session Redis fallback
`src/admin/src/main.ts`: intenta Redis store, si falla → fallback a in-memory con warning "not for production"  
**Estado**: Graceful fallback implementado ✅ (PT-013)

### ThrottlerModule sin fallback de storage
En-memoria sin Redis — no es un fallo sino el comportamiento estático actual (H-002)

### Transacciones Prisma atómicas
Todas las operaciones wallet en `prisma.$transaction()` — rollback automático si cualquier paso falla  
**Estado**: ✅ IMPLEMENTADO

---

## F8.5 — D5 Operational Reliability

| Métrica D5 | Sistema IronLoot | Estado |
|---|---|---|
| Success Rate | No medible sin logs en vivo | PENDIENTE (BLQ-002) |
| Retry Rate | BullMQ queues configuradas — reintentos no medidos en vivo | PENDIENTE (BLQ-002) |
| Failure Rate | No medible sin logs en vivo | PENDIENTE (BLQ-002) |
| Hallucination Rate | **NO_APLICA** — sistema determinista | N/A |
| Output Drift | **NO_APLICA** — sistema determinista | N/A |
| `health_unstable` | `false` — no hay LLM | N/A |

**D5 conclusión**: No se puede calcular D5 cuantitativo sin logs en vivo. No activa el cap de clasificación B porque `health_unstable = false`.

---

## Hallazgos D3

**No se identificaron hallazgos ABIERTOS en D3** (las anomalías de logging del PaymentsService fueron clasificadas D2 por impacto arquitectural, no D3 operacional).

---

## Score D3

Sin penalizaciones en D3.

**D3 = 100**

*Nota: confidence reducida (70%) por BLQ-002. Si logs en vivo revelaran gaps adicionales en próxima auditoría, D3 podría bajar. Próxima auditoría recomendada para D3 en 30 días.*

---

## Update U-004 — DS-004 (2026-07-27)

Logs **leídos**, no supuestos. Traza de pagos de la última corrida: 9 pasos distintos, 30 eventos.

- Credenciales filtradas: **0**.
- Entradas redactadas: **4**, y cada una **nombra qué ocultó** en `redacted_fields`
  (`headers.x-signature`, `response.authorization_code`).

Redacción marcada, no borrado silencioso — que es lo que CLAUDE.md exige. D3 se mantiene en 100.

---

## Update U-006 — S-002 (2026-07-27): leído, no supuesto

`[R51]` prohíbe asumir que el logging funciona. Se leyeron los logs del contenedor en marcha.

### Logs en vivo

`docker logs ironloot-api` — JSON estructurado con `timestamp`, `level`, `service`, `env`,
`traceId` y `duration` en cada entrada. El cron de subastas corre cada minuto, toma y suelta su
cerrojo (`lock:auction-close`, TTL 60 s) y deja constancia de ambas cosas. Cada petición HTTP
escribe su `request_log` (960 filas acumuladas). Peticiones con `traceId` propagado extremo a
extremo; las del cron, marcadas `no-context`.

**Ninguna excepción no manejada en la ventana observada.**

### Checkpoint D3

`npm run audit:observability`

```
  silent_failure_count = 25   (linea base: 25)   — sin silencios nuevos
  trace_completeness   = 100%    1 de 1 ciclos liquidados con la cadena completa
  prompt_provenance    = NO_APLICA
  fallback_quality     = evaluacion documentada ([R57])
```

### Traza de pagos, sobre datos reales

49 eventos en `payment_cycle_events`, 8 pasos distintos:

```
 PROVIDER_CONFIRM 17 · POLL_ATTEMPT 15 · DEPOSIT_REQUESTED 5 · PROVIDER_CREATE 4
 CYCLE_DECISION 3 · SIGNATURE_OK 2 · NOTIFICATION_RECEIVED 2 · WALLET_CREDITED 1
```

Credenciales: **0 visibles**. 4 eventos redactados, y cada uno **nombra qué ocultó**
(`headers.x-signature`, `response.authorization_code`). Redacción marcada, no borrado silencioso.

### D5 — fiabilidad operacional

```
  Success Rate 100% VERDE · Retry Rate 0% VERDE · Failure Rate 0% VERDE
  health_unstable = false
```

3 ciclos abiertos en sondeo — la vía garantizada haciendo su trabajo, no un fallo.

### Score D3 — S-002

```
100 − 0 = 100
```

Sin hallazgos activos en D3.

---

## Update U-007 — 2026-07-29 (S-003, delta sync)

**Logs vivos leidos**, no supuestos. 4 780 lineas del API en 24 h, JSON estructurado con `traceId`,
`level`, `context`, `http` y `error.code`, mas la distincion `isBusinessError`.

Persistencia: `request_logs` 1 943 · `error_events` 84 · `audit_events` 1. En cada arranque:
*«Error persistence connected»*.

**Los 84 errores, clasificados:** 60 `INVALID_CREDENTIALS` (401), 22 `RATE_LIMIT_EXCEEDED` (429), 2
`UNAUTHORIZED` (401). **Cero no-de-negocio.** Los 22 × 429 demuestran que el rate limiting *actua*.

`audit:observability`: `silent_failure_count` 25 = 25, sin silencios nuevos.
`trace_completeness` = **SIN CICLOS** — el tercer estado de PT-138 haciendo su trabajo: dice que no
pudo medir en vez de devolver 0 % o null.

**D3 se mantiene en 100**, y esta vez con observacion directa detras.

**Nuevo, detectado aqui:** H-023 — `UserResponseDto` publicado dos veces con esquemas distintos en el
catalogo OpenAPI, con aviso en cada arranque de que en la proxima version mayor sera un error.

**Nuevo, detectado aqui:** H-021 y H-022 salieron al ejecutar los checkpoints de delta sync (D1.N1 y
D5), que es trabajo de F8 aunque penalicen D2.

---

## Update U-008 — 2026-07-29 (S-004, delta sync)

**Logs leidos, no supuestos.** 537 `request_logs` persistidos, 545 en las ultimas 24 h.
`silent_failure_count = 25`, **igual que la linea base**: veinticinco PT y ningun `catch` mudo nuevo.

`trace_completeness` = **SIN CICLOS** · `prompt_provenance` = `NO_APLICA` · D5 = `SIN_DATOS`.
`health_unstable = false`.

### H-026 — Redis no se puede observar

`GET /api/v1/health/detailed` devuelve `degraded` **siempre**:

```json
{"status":"degraded","dependencies":{
  "database":{"status":"up","latency":0},
  "redis":{"status":"unknown","message":"Redis check not implemented"}}}
```

`health.service.ts:89` devuelve `unknown` fijo, y `:65` calcula `allUp ? 'healthy' : 'degraded'`. `redis`
**nunca** puede valer `up`, asi que el endpoint **no puede** devolver `healthy`.

Dos consecuencias, y la segunda es la que lo hace hallazgo: reporta un problema inexistente en cada
consulta —ruido que enseña a descartar la fuente— y **si Redis se cayera de verdad diria exactamente lo
mismo**. Una caida real es indistinguible del funcionamiento normal en el unico endpoint que existe para
diagnosticarla.

MEDIA y no ALTA porque nada depende de ese endpoint: el `healthcheck` de Docker usa `/api/v1/health`, que
responde 200, y `database` si se comprueba de verdad. El sistema esta sano; lo que no se puede **observar**
es Redis.

### H-025 — el veredicto de coherencia, verde sobre cero filas

Detectado aqui, imputado a **D2** (integridad del instrumento), igual que H-021.

`cross_coherence_verified = verificado`, «5 de 5 medidas, 0 incoherentes», **con la base vacia**. Las cinco
consultas corren limpias y devuelven «0 incoherencias» porque no hay una sola fila que comparar. Sexta
aparicion del patron: PT-149 corrigio el caso «no pude conectar» y dejo el caso «no habia datos», y el
docstring de `veredictoCoherencia()` declara la proteccion que el codigo no implementa.

Evidencia: **E-029**, **E-031**.

---

## Update U-009 — 2026-07-29 (S-004-M, medicion dirigida)

**D5 medido por primera vez en la historia de esta auditoria.**

```
  Success Rate   100%   VERDE   1 de 1 ciclos resueltos sin necesitar la via garantizada
  Retry Rate       0%   VERDE   0 de 1 ciclos RESUELTOS necesitaron un POLL_ATTEMPT
                                 · 1 ciclo abierto en sondeo (no cuenta)
  Failure Rate     0%   VERDE   0 de 3 ciclos EXPIRED o FAILED
  health_unstable = false
```

**La muestra es de 3 ciclos, 1 resuelto.** Se dice explicitamente para que nadie lea «Success Rate 100 %»
como una estadistica robusta: es la primera medicion, no una serie. `[A8]` obliga a declarar la cobertura,
y una muestra de 3 es cobertura declarada, no cobertura amplia.

**`trace_completeness` = 100 %** — 1 de 1 ciclos liquidados con la traza completa. Confirmado ademas por la
suite, que lo comprobo de punta a punta sobre un pago real de Mercado Pago:

```
DEPOSIT_REQUESTED → PROVIDER_CREATE → NOTIFICATION_RECEIVED → SIGNATURE_OK →
PROVIDER_CONFIRM → CYCLE_DECISION → WALLET_CREDITED
```

**`silent_failure_count` = 25**, igual que la linea base: veinticinco PT y ningun `catch` mudo nuevo.

### H-027 — el resumen de la suite omite la fase que falla

La `Fase 71 — PAGO REAL POR PAYPAL VIA GARANTIZADA` fallo con `TimeoutError` (la UI de sandbox de PayPal
intercepta el click) y **el `RESUMEN FINAL` no la menciona**: `run-all.sh:73-76` usa
`[ -f "$f" ] && echo …`, asi que una fase sin `.json` desaparece. Se leen **nueve fases, todas PASS**, y el
runner ejecuta diez.

Lo que quedo sin verificar es **la via garantizada de PayPal**, que es donde mas importa: en Orders v2
aprobar **no mueve el dinero**, asi que su via garantizada **captura**. Septima aparicion del patron de la
casa, esta vez por omision: no miente, calla.

### H-025, reforzado con la base poblada

Con salida real dentro, el veredicto sigue diciendo `verificado · 5 de 5 medidas`, y **cuatro de las cinco
comprobaciones compararon CERO filas** (0 pedidos, 0 comisiones, 0 disputas). Es evidencia mas fuerte que
la de `E-029`: alli la base estaba vacia y podia parecer un limite del entorno.

Evidencia: **E-032**.

---

## Update U-010 — 2026-07-29 (S-005, delta sync)

**D3 = 100.** `silent_failure_count = 25`, **igual que la linea base**, y `trace_completeness = 100 %`
(2 de 2 ciclos liquidados).

**Pero llegar a 25 costo una correccion.** La primera medicion dio **27**: dos `catch` nuevos en
`pages-orders-detail.js`, introducidos por **PT-174 unas horas antes**, que avisaban a la persona y **no
dejaban rastro del error**. Con `catch { }` sin capturar, «no se pudo contactar» no distingue un timeout de
un 500 ni de un bloqueo de la CSP — tres causas con tres soluciones distintas. Corregidos en PT-180.

**El checkpoint funciono sobre trabajo del mismo dia**, que es exactamente para lo que existe.

### La salud, en vivo y en los dos estados — H-026 cerrado

```
Redis en pie:  {"status":"healthy",  "redis":{"status":"up","latency":1}}
Redis parado:  {"status":"unhealthy","redis":{"status":"down","message":"PING sin respuesta en 2000 ms"}}
```

`healthy` **era inalcanzable por construccion** hasta PT-178. Y hubo un hallazgo dentro del hallazgo: sin
`@SkipThrottle()` la peticion no llegaba al controlador, porque el limitador consulta Redis — **el endpoint
que diagnostica la caida era el que la caida silenciaba**.

### H-028 — D5 mide, y por primera vez no se pronuncia

```
  Success Rate  50%  SIN_DATOS   1 de 2 … · MUESTRA INSUFICIENTE (<20): el semaforo no se pronuncia
  Retry Rate    50%  SIN_DATOS
  Failure Rate   0%  SIN_DATOS
  health_unstable = false
```

La primera medicion de esta corrida dio `Success Rate 50 % ROJO` -> `health_unstable = true` -> **clase
capada a B**, con el sistema **sano**: el ciclo que uso la via garantizada la uso porque el sandbox de
PayPal no notifico, que es lo que PT-087 diseño.

Con `n = 2` una tasa solo puede valer 0 %, 50 % o 100 % y el umbral verde es `>= 95`: **un solo fallback
fuerza ROJO por aritmetica**. Y al reves es peor: `1 de 1` daba `100 % VERDE` y se leia como fiabilidad
demostrada — fue la primera medicion de D5 de esta auditoria, en S-004-M.

Corregido por PT-180 con `MUESTRA_MINIMA = 20`, **derivada de los umbrales del propio fichero**: con
`>= 95 %`, un fallo entre `n` cumple `(n-1)/n >= 0.95` solo si `n >= 20`.

**Consecuencia declarada: `cobertura_D5 = 0 %`.** La falta de evidencia pesa donde debe — en la cobertura,
no en un veredicto inventado.

Evidencia: **E-033**.

---

## Update U-011 — 2026-07-29 (S-007, delta sync): un fallo que no llegaba a nadie

Los dos hallazgos de esta corrida son de D3 y salieron de **ejecutar el camino de fallo**, no de leer código.
El camino feliz del correo estaba probado desde siempre; el otro, nunca.

### H-032 (ALTA) — tres capas de recuperación anuladas por la de abajo

`EmailService` capturaba cualquier error de envío y no lo relanzaba, llevando su propia duda escrita al lado:

```ts
// Don't rethrow to avoid breaking registration flow?
// Ideally should queue or retry. For now log error.
```

Había `log.error`, así que **no era un silencio**. Lo que hacía era peor de medir: el flujo continuaba como si
el correo hubiera salido.

`notification-queue.worker.ts` tiene un `catch` que cuenta intentos, los registra y **relanza para que BullMQ
reintente**. Ese `catch` **no podía ejecutarse nunca**, así que un envío fallido marcaba el trabajo como
**completado con éxito**. Familia de **H-014**, **H-015** y **H-027** — *un mecanismo que no se ejecuta no avisa
de nada*, y aquí eran tres: el `catch`, el contador y la política de reintentos.

La corrección es de reparto de responsabilidad, no de manejo de errores: **el servicio no decide por sus
llamantes** (→ **RULE-36**). Los cuatro llamantes declaran su decisión con el motivo escrito; dos propagan
—reenvío y cola— y dos capturan —registro, porque la cuenta ya existe, y recuperación de contraseña, porque su
respuesta es **opaca a propósito** y propagar convertiría una caída del SMTP en un **oráculo de enumeración**.

### H-033 (MEDIA, preexistente) — 121 s colgado

El transporte no declaraba **ningún** tope, así que nodemailer aplicaba el suyo: dos minutos para conectar.
Medido con Mailhog parado: `real 2m1.490s`. Afectaba al reenvío **y al registro**.

Estaba **tapado por H-032**: los dos minutos ya pasaban, pero al final se respondía `200`, así que nadie
relacionaba la lentitud con el correo. **Corregir H-032 no creó la espera: la hizo visible.**

`MAIL_TIMEOUTS_MS` — 5 000 / 5 000 / 10 000 ms, **derivados** de lo que este sistema ya espera de un tercero
(5 000 ms para Google en el guard de reCAPTCHA, 2 000 ms para Redis). Corta en ~5 s.

### El checkpoint D3 cazó, por tercera vez en la jornada, un `catch` mudo del día

```
silent_failure_count = 26   (linea base: 25)   →  FALLA
  src/api/src/modules/auth/guards/recaptcha.guard.ts  (linea 97)
```

Escrito por **PT-182**, unas horas antes, con una justificación mía que era **falsa**: *«no se registra porque
este guard no tiene el logger inyectado y añadirlo cambiaría su firma en todos los llamantes»*. Un guard recibe
sus dependencias **por inyección**. El argumento sonaba a razón técnica y era comodidad. Logger inyectado →
vuelta a **25**.

**D3 sigue en 100**: los dos hallazgos abrieron y cerraron dentro de esta corrida. Evidencia `E-036`.

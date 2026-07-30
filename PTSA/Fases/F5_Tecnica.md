# F5 — Auditoría Técnica (Architectural Integrity)

**Estado**: COMPLETADA (parcial — BLQ-001 limita verificación de DB real)  
**Fecha**: 2026-06-23  
**Confidence**: 82%  
**Dimensión principal**: D2 — Architectural Integrity

---

## Alcance

F5 verifica: calidad de código, seguridad, deuda técnica, integridad de DB (schema), patrones arquitectónicos reales vs documentados.

**Limitaciones activas**:
- BLQ-001: No acceso a DB real — schema verificado via `schema.prisma` (proxy de alta fidelidad para estructura, no para datos/integridad en vivo)
- BLQ-002: No acceso a logs en vivo — logging verificado via código fuente

---

## F5.1 — Verificación de Schema (proxy via schema.prisma)

**Fuente**: `src/api/prisma/schema.prisma`

Hallazgos positivos:
- Todos los campos financieros usan `Decimal(10,2)` o `Decimal(12,2)` — no hay `Float` en columnas monetarias ✅ (CR-015)
- Claves foráneas definidas con `@relation` y cascadas explícitas ✅
- Enums para estados (`AuctionStatus`, `OrderStatus`, `DisputeStatus`, `UserState`) — type-safe ✅
- `created_at`/`updated_at` presentes en todas las entidades de negocio ✅
- `LedgerEntry` sin `updated_at` (inmutable por diseño) ✅

Limitaciones (BLQ-001):
- No se puede verificar índices en DB real (solo inferibles desde `@@index` en schema)
- No se puede verificar datos de migración o FK integrity en vivo

---

## F5.2 — Seguridad

### HMAC Webhook Validation ✅ (CR-008)
Verificado via grep en todos los providers:
- `MercadoPagoProvider`: `WebhookSignatureValidator.validateHmacSignature()` de @ironloot/core
- `HeyBancoProvider`: `createHmac` de Node.js crypto
- `PaypalProvider`: Valida IPN signature, throw si inválido

### JWT y Auth ✅ (CR-013)
- `AuthService` maneja `UserState.PENDING_VERIFICATION`, `UserState.BANNED`
- Tokens en HttpOnly cookies en SSR sites
- `RolesGuard` para endpoints admin/seller

### CORS ✅
- Configurado en PT-024 con CORS restrictivo

### CSRF ✅
- Documentado en `09-Security-Architecture.md` — double-submit cookies

### Distributed Lock ✅
- `lock:auction-close` con TTL 60s en Redis — previene doble cierre de subasta

### Anomalías de seguridad detectadas:
- **H-004**: Withdraw payment method validation comentada — MEDIA
- **H-006**: CLIENT expone `apiUrl` al browser — MEDIA (confidence parcial)

---

## F5.3 — Calidad de código y patrones

### Patrón StructuredLogger
- Implementado en `src/api/src/common/observability/`
- `BidsService`, `WalletService`, `AuthService` usan StructuredLogger ✅
- **H-003**: `PaymentsService` usa Logger estándar — excepción al patrón — BAJA

### Transacciones atómicas ✅
- `WalletService`: todas las operaciones financieras en `prisma.$transaction()` con LedgerEntry
- Verificado que no existe mutación de wallet sin ledger entry (CR-012)

### @ironloot/core como única fuente de reglas de dominio ✅
- `AuctionStateMachine`, `BidValidation`, `DisputeStateMachine`, `WalletCalculation`, `WebhookSignatureValidator`
- Importados desde servicios del API — no hay reglas duplicadas inline

### Hardcoding de configuración:
- **H-001**: `EXTENSION_MS = 5 * 60 * 1000` en BidsService — viola principio de configurabilidad

### ThrottlerModule:
- **H-002**: Sin Redis storage — limitación conocida para multi-instancia

---

## F5.4 — Deuda Técnica Catalogada

| ID | Severidad | Descripción | Estado PTSA |
|---|---|---|---|
| TD-001 | HIGH | CFDI stub | H-005 (ALTA) |
| TD-003 | MEDIUM | Withdraw payment method mock | H-004 (MEDIA) |
| ND-002 | — | ThrottlerModule in-memory | H-002 (MEDIA) |
| ND-007 | — | CLIENT apiUrl browser exposure | H-006 (MEDIA) |

---

## Hallazgos D2 identificados en F5

| Finding | Tipo | Severidad | Penalización |
|---|---|---|---|
| H-002 | OPERATIONAL | MEDIA | -5 |
| H-003 | OBSERVABILITY | BAJA | -1 |
| H-004 | SECURITY | MEDIA | -5 |
| H-006 | SECURITY | MEDIA | -5 |

**Score D2 parcial**: 100 - 5 - 1 - 5 - 5 = **84**

---

## Update U-004 — DS-004 (2026-07-27)

Esquema **real** verificado por shell (no por migraciones): 33 tablas en BD = 33 modelos en
`schema.prisma`. Índice `payments_reference_key` presente — es el que impide el asiento duplicado.

`npm audit --omit=dev`: **71 vulnerabilidades** (3 críticas, 53 altas, 15 moderadas). Alcanzabilidad
resuelta paquete a paquete con `npm ls` y localizada en el código. Evidencia **E-011**, hallazgo
**H-008**.

---

## Update U-006 — S-002 (2026-07-27): el esquema es correcto, el artefacto que lo construye no

### Esquema real, por shell (`[R70]`)

33 tablas = 33 modelos. 17 columnas de dinero, **todas** `numeric(10,2)` o `numeric(12,2)`; **0**
columnas `double precision` o `real`. Los seis índices únicos que sostienen invariantes financieras
están presentes y verificados uno a uno (E-019), incluido `payments_reference_key`.

`prisma migrate diff --from-schema-datamodel … --to-schema-datasource …` → **No difference
detected**. El esquema real y `schema.prisma` coinciden.

### Y sin embargo — H-014

`_prisma_migrations` **no existe**. Las 23 migraciones no se han ejecutado nunca: el esquema lo
construye `prisma db push --accept-data-loss` en `entrypoint.dev.sh:52`.

Aplicadas a una base limpia, las 23 producen un esquema **distinto**, sobre el que la aplicación no
funciona: 3 de 4 sondas del cliente Prisma fallan, una de ellas sobre `payment_cycles`. Y
`payments.reference` deja de ser único — la unicidad que CLAUDE.md declara como garantía contra el
asiento duplicado.

Evidencia **E-017**, hallazgo **H-014** (CRITICA, D2, penalización 30).

### CI — H-015

`test-integration` levanta Postgres y corre la suite e2e **sin crear el esquema**, con una suite que
además no cierra sus manejadores. `build` y `docker` cuelgan de él y no se ejecutan.

Evidencia **E-018**, hallazgo **H-015** (ALTA, D2, penalización 15).

### Lo que está sano

| | |
|---|---|
| `npm run audit:check` | **0 avisos** en producción, línea base vacía — TD-015 cerrado por PT-126 |
| `npm run typecheck` | limpio, exit 0 |
| Pruebas API | 83 suites / **603 tests**, todas verdes |
| Pruebas CORE | 8 suites / **134 tests**, todas verdes |
| Endpoints sensibles sin token | 401 en los tres probados |
| `emit` de WebSocket | los cinco a salas `auction:<id>`, datos públicos; ningún dato por usuario |

**H-008 queda comprobado en la fuente real.** Los 71 avisos de DS-004 son hoy 0.

### Score D2 — S-002

```
100 − 30 (H-014, CRITICA) − 15 (H-015, ALTA) = 55
```

Ningún hallazgo D2 anterior penaliza: H-008 y H-013 están CERRADA.

### H-017 — el camino a producción, encontrado al comprobar la salud al cierre

`src/api/Dockerfile:60` pide `http://localhost:3000/health` para su healthcheck. En vivo esa ruta
devuelve **404**: el prefijo global es `/api`, la ruta real es `/api/v1/health`. El healthcheck de
`docker-compose` sí está corregido — se arregló ahí y no en la imagen de producción.

Además: ADMIN, BASE y CLIENT **no tienen `Dockerfile` de producción**, sólo `.dev`. Y el job
`docker` de CI construye `./Dockerfile`, que no existe en la raíz.

Evidencia **E-021**, hallazgo **H-017** (ALTA, D2, penalización 15).

### Score D2 — S-002 (corregido tras H-017)

```
100 − 30 (H-014) − 15 (H-015) − 15 (H-017) = 40
```

Los tres describen lo mismo desde tres ángulos: **el camino de este entorno a cualquier otro no se
ha recorrido nunca.** Esquema, pipeline e imagen.

---

## Update U-007 — 2026-07-29 (S-003, delta sync)

**Esquema real verificado por shell**, no por migraciones (F5 lo exige asi).

33 tablas en `public`. `_prisma_migrations` **existe y esta poblada**:

```
20260727000000_initial_schema                        | aplicada 2026-07-28 22:22 | sin rollback
20260729020000_pt145_rating_unico_por_pedido_y_autor | aplicada 2026-07-29 02:18 | sin rollback
```

Dos migraciones en disco, dos aplicadas. **H-014 —el CRITICO de S-002— queda verificado en la fuente
real** y deja de sostenerse solo en el testimonio del PT que lo corrigio.

`audit:schema` OK: las migraciones reproducen `schema.prisma`. `audit:check` OK contra una linea base
vacia a proposito.

**Invariante contable comprobada directamente:** dos monederos a 100.00 con un asiento cada uno,
`balance_before 0.00 -> balance_after 100.00`. Saldo y asiento coinciden.

**Integridad de la traza:** 12 `payment_cycle_events` con `cycle_id` NULL, **0 huerfanos reales**. La
FK es `ON DELETE SET NULL` sobre columna opcional: es diseño, la traza sobrevive al ciclo.

**Nuevo en D2:** H-021 (ALTA) y H-022 (MEDIA), los dos en `src/api/scripts/**`, que esta dentro de
`auditable_patterns` desde S-002.

---

## Update U-008 — 2026-07-29 (S-004, delta sync)

**Esquema verificado en la base real, y por primera vez tambien contra el modelo.**

```
tablas en public (sin _prisma_migrations): 33
migraciones aplicadas (finished_at NOT NULL, rolled_back_at NULL): 2
  20260727000000_initial_schema
  20260729020000_pt145_rating_unico_por_pedido_y_autor
```

`audit:schema` → **OK: las migraciones reproducen `schema.prisma`.** Es un paso mas alla de lo que S-003
pudo afirmar: alli se verifico que `_prisma_migrations` existia y que las dos estaban aplicadas; ahora se
verifica que **producen el modelo declarado**. La garantia de H-014 queda cerrada por los dos extremos.

**Con un matiz que hay que dejar escrito:** la primera ejecucion **fallo** con `P1003` — la base sombra
`ironloot_db_shadow_check` no existe en el entorno local. El instrumento **se comporto bien**: no dijo OK,
nombro la causa y salio con 1. El job `schema-drift` de CI crea esa base explicitamente (PT-136 lo
descubrio ejecutando). **No es hallazgo**: es un prerrequisito del entorno local que nadie satisface.

**Vulnerabilidades:** `audit:check` → 0 avisos, sin novedades respecto a la linea base vacia.

**Datos: cero.** 0 usuarios, subastas, pujas, pedidos, pagos, ciclos, asientos, comisiones y eventos de
traza. 537 `request_logs`. Es la causa de que D1 caiga al 7 % de cobertura (ver `F6`) y de que D5 siga sin
medirse.

**Un falso hallazgo descartado:** `ledger_entries` no existe porque la tabla se llama `ledger`. Se
comprobo en `information_schema` antes de concluir nada; sobre una tabla de contabilidad, un
`relation does not exist` tiene la forma exacta de un hallazgo grave.

Evidencia: **E-029**, **E-030**.

---

## Update U-009 — 2026-07-29 (S-006, delta sync): dos controles que aparentaban estar puestos

El barrido de esta corrida no buscó errores: buscó **afirmaciones**. En D2 salieron dos, y ninguno de los dos
fallaba nunca — por eso uno llevaba meses.

### H-029 — `recaptcha.guard.ts` comprobaba la existencia del token, no su validez

```ts
if (!token) throw new ForbiddenException('CAPTCHA token required');
// TODO: Verify token with Google API
return true; // Mock success for now
```

Con `RECAPTCHA_ENABLED=true`, la cadena `"x"` pasaba igual que un token legítimo de Google, y esto protege
`POST /auth/register`. **No había exposición mientras la variable estuviera en `false`** —su valor por
defecto— y ahí estaba el peligro: el día que alguien la encendiera creería tener protección contra bots y no
la tendría. Familia de H-004 (la validación del método de pago comentada en el retiro).

Corregido en PT-182: verifica contra Google y **falla cerrado**. Sin secreto, no pasa. Google dice `false`, no
pasa. **Google no responde, no pasa** — un timeout no puede ser una puerta accionable por quien sepa
provocarlo. Siete casos, con C1 y AC-02 como controles: el comportamiento por defecto y la forma de mandar el
token no cambian.

### H-031 — la reserva de `SETTLEMENT_HOLDBACK_HOURS` era `0`

```yaml
- SETTLEMENT_HOLDBACK_HOURS=${SETTLEMENT_HOLDBACK_HOURS:-0}
```

La espera que protege al comprador **valía cero** en cualquier despliegue que no declarase la variable: el
neto de la venta se liberaba al instante de la confirmación, sin ventana, y **nada lo habría dicho** — el cron
corre, los asientos cuadran, la espera simplemente no ocurre.

Es **RULE-17 aplicada a una regla de negocio**: *un valor por defecto convierte «mal configurado» en
«configurado hacia ninguna parte»*. Aquí el proceso no sólo arranca — funciona, y funciona **sin la
protección**.

**Lo introdujo PT-174 unas horas antes**, para que la fase 35 de QA no esperase tres días. Reserva a `:-72`, y
QA **declara** su `0` en el `.env`: eso es configurar.

Y la guarda nueva **tenía el defecto que venía a vigilar** — contaba `..` a mano para llegar a la raíz y
dentro del contenedor eso daba `/docker-compose.yml`, así que el caso fallaba por no encontrar el fichero. Una
guarda inútil sin dejar de existir. Se vio fallar **por el motivo correcto** después de arreglarla.

**D2 sigue en 100**: los dos abrieron y cerraron dentro de esta corrida. Evidencias `E-034` (los defectos) y
`E-035` (los cierres).

---

## Update U-010 — 2026-07-29 (S-009, delta sync): una guarda con el nombre correcto mirando otra cosa

### H-035 (MEDIA)

```ts
// distributed-lock.service.ts:12
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
```

Es **el defecto que PT-137 corrigió**, sobreviviendo en un fichero. El cliente de al lado —el del rate limiting—
lleva escrito el comentario que lo nombra: *«PT-137 — Mismo defecto que las colas: reserva a `localhost`»*. Ése se
corrigió; éste se quedó.

**Y lo que importa es por qué pudo quedarse.** La guarda de RULE-17 comprueba que toda variable que el código lee
esté **declarada** en un `.env.example`. El texto de la regla dice, en negrita y como afirmación central:

> *The fallback was the problem, not the variable.*

**Esa mitad no la comprobaba nadie.** La regla nació de cinco contenedores caídos: se vigiló lo fácil de medir
—¿está declarada?— y quedó sin vigilar lo que causó el incidente —¿tiene reserva?—. Por eso este `||` pasó por
PT-137, por PT-147 y por todas las corridas de la suite.

Es la familia de **H-031**: allí la guarda del holdback miraba el servicio y el agujero estaba en el compose. La
forma se repite lo suficiente para nombrarla — **una guarda puede existir, tener el nombre correcto y mirar al lado
del agujero.**

### Lo que costaba

`DistributedLockService` impide que dos instancias procesen el mismo cierre de subasta. Con la reserva, un
despliegue sin `REDIS_URL` **arranca**, apunta a un `localhost` que en el contenedor no es nadie, `acquireLock`
entra en su `catch` y **relanza**: el cron propaga y **ninguna subasta se cierra**. Desde fuera, subastas que nunca
terminan.

No hay doble procesamiento —eso lo salva el `throw`—, pero el ciclo de vida se detiene. Es el precio que RULE-17
describe: *«un valor por defecto convierte "mal configurado" en "configurado hacia ninguna parte", y el proceso
arranca»*.

### El cierre

URL por inyección validada con `redisUrlObligatoria(...)`, y **`conexiones-sin-reserva.spec.ts`** para la mitad de
la regla que no tenía guarda: las tres formas de escribir una reserva, con C4 cubriendo la del incidente original
(`config.get('REDIS_HOST', 'localhost')`) y C6 descartando comentarios **por precedente** — la guarda de RULE-17 se
acusó a sí misma la primera vez que corrió.

**Vista acusar al fichero correcto, y sólo a ése**, antes del arreglo.

**D2 sigue en 100**: el hallazgo abrió y cerró dentro de esta corrida. Evidencia `E-038`.

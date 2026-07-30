---
ptsa_version: 3.0
fase: F-1
nombre: Declaración de Valor
estado: COMPLETADA
ultima_actualizacion: 2026-06-23
confidence: 95
sesion: S-001
---

# F-1 — Declaración de Valor

**Sistema:** IronLoot — Plataforma de Subastas en Tiempo Real  
**Versión:** v1.0.0  
**Fecha:** 2026-06-23  
**Auditor:** Agente PTSA V3 (S-001)  
**Fuente:** `docs/enterprise-documentation/` (Foundation Protocol VALIDATED 2026-06-23), `CLAUDE.md`, `src/api/prisma/schema.prisma`, `docker-compose.yml`

---

## 1. Declaración de Dominio

> IronLoot es una **plataforma de subastas en tiempo real para el mercado mexicano (MXN)** que permite a compradores pujar en objetos a subasta con gestión automática de fondos por monedero digital, procesamiento de pagos integrado (Mercado Pago como proveedor primario, PayPal secundario), y un sistema estructurado de resolución de disputas post-entrega con ventana de 14 días.

**Verificabilidad:** El dominio es declarado sin ambigüedad — todos sus componentes son verificables (monedero, pagos, disputas, ventana de 14 días). ✅

**Tipo de sistema:** Determinístico transaccional. **No usa IA/LLM.**  
→ Nivel 4 (Guardrails IA) del Acid Test: **NO_APLICA**  
→ D5 `hallucination_rate` y `output_drift`: **NO_APLICA**

---

## 2. Actores

| Actor | Rol |
|:---|:---|
| **Comprador (Buyer)** | Navega subastas, coloca pujas, gestiona monedero, abre disputas |
| **Vendedor (Seller)** | Crea subastas en DRAFT, envía pedidos, recibe pagos menos comisión |
| **Admin** | Modera subastas, gestiona usuarios, supervisa KYC, ve reportes |
| **Sistema** | Ejecuta cron jobs (cierre, soft-close, cleanup), envía notificaciones, procesa webhooks |

Fuente: `docs/enterprise-documentation/01-Platform-Overview.md`

---

## 3. Productos Esperados

### 3.1 Productos Primarios (consumidos directamente por usuarios/sistemas externos)

| ID | Producto | Consumidor | Criticidad |
|:---|:---|:---|:---|
| **P-001** | **Bid (Puja)** — estado de puja con bloqueo correcto de fondos + broadcast WebSocket | Comprador + tiempo real | CRÍTICA |
| **P-002** | **Auction Close (Cierre de Subasta)** — ciclo completo: identificación de ganador + creación de pedido + redistribución de fondos + notificaciones | Sistema/Comprador/Vendedor | CRÍTICA |
| **P-003** | **Order (Pedido)** — registro de transacción comercial creado automáticamente al cierre | Comprador/Vendedor | ALTA |
| **P-004** | **Payment (Pago)** — pago procesado con validación HMAC del webhook → confirmación de crédito | Comprador | CRÍTICA |
| **P-005** | **Wallet Transaction (Transacción de Monedero)** — actualización de balance con ledger inmutable | Comprador/Vendedor | CRÍTICA |
| **P-006** | **Dispute (Disputa)** — disputa abierta dentro de ventana de 14 días, con estado gestionado | Comprador | ALTA |
| **P-007** | **Notification (Notificación)** — notificación in-app + email entregada al usuario correcto | Comprador/Vendedor | MEDIA |
| **P-008** | **JWT Authentication Token** — token de acceso emitido a usuario autenticado y verificado | Todos | ALTA |
| **P-011** | **KYC Submission (Verificación KYC)** — estado de verificación de identidad de vendedor | Vendedor | ALTA |

### 3.2 Productos Secundarios (alimentan a primarios)

| ID | Producto | Alimenta a | Criticidad |
|:---|:---|:---|:---|
| **P-009** | **Ledger Entry (Entrada de Ledger)** — registro inmutable de cada cambio de balance | P-005 Wallet Transaction | CRÍTICA |
| **P-010** | **Commission Record (Registro de Comisión)** — cálculo y registro de comisión de plataforma por pedido | P-003 Order | MEDIA |
| **P-012** | **CFDI Record (Registro Fiscal)** — factura fiscal CFDI/PAC ligada a pedido | P-003 Order | BAJA (STUB) |

**Nota P-012:** El módulo CFDI es un stub declarado — ninguna integración real con PAC (Proveedor Autorizado de Certificación). Esto constituye un gap de dominio (fiscal compliance incompleta). Se registrará como hallazgo en F6.

---

## 4. Reglas de Dominio Objetivas (candidatos a Domain Rules as Code)

Las siguientes reglas son determinísticas, verificables y candidatas a tests ejecutables en F12.

| ID | Regla | Campo verificable | Severidad si falla |
|:---|:---|:---|:---|
| **CR-001** | El balance del monedero NUNCA puede ser negativo | `wallets.balance >= 0` | CRÍTICA |
| **CR-002** | Los fondos retenidos no pueden superar el balance disponible | `wallets.held_funds <= wallets.balance` | CRÍTICA |
| **CR-003** | Cada cambio de balance genera exactamente una entrada de Ledger | `COUNT(ledger WHERE wallet_id=?) > 0` después de toda operación | ALTA |
| **CR-004** | El monto de depósito DEBE coincidir con el pago verificado del proveedor | `payment.amount == dto.amount` | ALTA |
| **CR-005** | Una puja en subasta propia es rechazada con `BID_ON_OWN_AUCTION` | Error 400 si `auction.sellerId == bid.userId` | ALTA |
| **CR-006** | Una puja inferior al precio actual es rechazada con `BID_TOO_LOW` | Error 400 si `bid.amount <= auction.currentPrice` | ALTA |
| **CR-007** | Una disputa fuera de la ventana de 14 días es rechazada con `DISPUTE_WINDOW_EXPIRED` | Error 400 si `now - order.deliveredAt > 14 días` | ALTA |
| **CR-008** | El webhook de pago DEBE ser validado por HMAC antes de procesamiento | Reject si signature inválida | CRÍTICA |
| **CR-009** | La ventana de soft-close es de 120s (configurable por `AUCTION_SOFT_CLOSE_WINDOW_SEC`) | Extensión exacta de 120s por puja en últimos 120s | ALTA |
| **CR-010** | La moneda DEBE ser MXN exclusivamente | `wallets.currency == 'MXN'`, `Decimal(10,2)` sin Float | ALTA |
| **CR-011** | Los secretos críticos en producción no son placeholders | `ADMIN_API_KEY`, `JWT_SECRET`, `SESSION_SECRET` no en PLACEHOLDER_SECRETS | CRÍTICA |
| **CR-012** | El JWT de acceso expira en `JWT_ACCESS_EXPIRY` (default 15m) | Token inválido tras expiración | ALTA |
| **CR-013** | Una cuenta no verificada no puede iniciar sesión (`USER_NOT_VERIFIED`) | Error 403 si `user.state == PENDING_VERIFICATION` | ALTA |
| **CR-014** | El límite de retiro diario es 5.000 MXN | Error 400 si `withdraw.amount > 5000` | MEDIA |
| **CR-015** | Los importes financieros usan `Decimal(10,2)` o `Decimal(12,2)`, nunca `Float` | Tipo de columna verificado en esquema BD | ALTA |

---

## 5. Rúbricas del Dominio

Para un sistema transaccional (no generativo), la "rúbrica" es la correcta aplicación de reglas de negocio y validaciones. Los criterios de validación son:

### 5.1 Completitud transaccional
- ✅ Toda operación de negocio crea los registros relacionados esperados
- ✅ Toda transacción de dinero tiene entrada de Ledger
- ✅ Todo cierre de subasta con ganador crea un pedido

### 5.2 Inmutabilidad del ledger
- ✅ El ledger es solo-append (sin updates ni deletes)
- ✅ Cada entry tiene tipo (`LedgerType`) correcto

### 5.3 Validación de seguridad financiera
- ✅ Webhooks con HMAC inválido son rechazados antes de procesamiento
- ✅ Depósitos verificados contra proveedor, no contra input del usuario

### 5.4 Restricciones de dominio temporal
- ✅ Disputas respetan ventana de 14 días
- ✅ Soft-close extiende exactamente 120s

### 5.5 Vocabulario prohibido en errores de dominio
- ❌ Mensajes de error internos que exponen stack traces a clientes
- ❌ Respuestas que confirman la existencia de un email no registrado (enumeración)

---

## 6. Umbrales D5 (métricas operacionales — sistema determinístico)

| Métrica | Verde | Ámbar | Rojo | Nota |
|:---|:---:|:---:|:---:|:---|
| **Success Rate** | ≥ 95% | 85–95% | < 85% | Adoptar umbrales por defecto |
| **Retry Rate** | ≤ 10% | 10–25% | > 25% | Aplicable a jobs BullMQ |
| **Failure Rate** | ≤ 2% | 2–8% | > 8% | Adoptar umbrales por defecto |
| **Hallucination Rate** | — | — | — | **NO_APLICA** (sistema determinístico) |
| **Output Drift** | — | — | — | **NO_APLICA** (sistema determinístico) |

Sin D5 en rojo → `health_unstable: false` esperado (verificar en F8).

---

## 7. ¿El sistema usa IA/LLM?

**No.** IronLoot es un sistema **puramente determinístico**. No hay invocaciones a modelos de lenguaje, generación de contenido por IA, ni prompts LLM.

Consecuencias:
- **Nivel 4 del Acid Test (Guardrails IA):** `NO_APLICA`
- **D5 Hallucination Rate:** `NO_APLICA`
- **D5 Output Drift:** `NO_APLICA`
- **D5** se evalúa solo con métricas de estabilidad: Success/Retry/Failure Rate

---

## Checklist F-1 ✅

- [x] Dominio declarado en frase verificable
- [x] Productos esperados enumerados (9 primarios + 3 secundarios = 12)
- [x] Reglas objetivas del dominio catalogadas (CR-001 a CR-015 — candidatos a Domain Rules as Code)
- [x] Rúbricas formales identificadas (completitud transaccional, inmutabilidad ledger, seguridad financiera, temporalidad)
- [x] Umbrales D5 declarados (o adoptados por defecto para determinístico)
- [x] ¿Usa IA/LLM? → No → Nivel 4 = NO_APLICA

**Estado: COMPLETADA** | Confidence: 95%


---

## Update U-005 — DS-005 / PT-113 (2026-07-27): la pregunta fiscal que falta

La investigación de PT-113 buscó en esta declaración y en el PRD **quién emite la factura de una
venta entre particulares**. No está en ninguno de los dos.

Es una regla de dominio ausente, no una implementación pendiente, y bloquea `H-005` más que el
trámite con el PAC. Las tres opciones, con lo que exige cada una:

| Modelo | Qué exige | Quién decide |
|---|---|---|
| **El vendedor emite** | Cada vendedor con su propio PAC y su e.firma. IronLoot no factura la venta | Negocio + fiscal |
| **IronLoot emite por cuenta del vendedor** | Figura de intermediario, autorización expresa del vendedor, sus datos fiscales completos, y un PAC con esa capacidad | Negocio + fiscal + legal |
| **IronLoot factura sólo su comisión** | Lo único enteramente bajo su control. No cubre la venta entre particulares | Negocio |

**Mientras no se decida, `CR-011` no es verificable**: dice que «toda transacción gravable debe
producir un `CfdiRecord` válido», pero no dice de quién es la obligación. Una regla de dominio que
no nombra al obligado no se puede auditar.

Se registra aquí para que la próxima sesión no vuelva a buscarla.

---

## Update U-006 — 2026-07-29: la facturación fiscal sale del alcance de v1.0

**Decisión del humano, recibida el 2026-07-29:** *«acepta como limitación declarada»*.

**Qué cambia en la declaración de valor.** `P-012 (CFDI Record)` **deja de ser un producto que v1.0
entrega**. Pasa a producto declarado **fuera de alcance**, con su motivo: emitir un CFDI exige un **PAC
certificado ante el SAT** —un tercero contratado— y una **decisión fiscal** sobre quién factura una venta
entre particulares. Ninguna de las dos cosas es código.

**Por qué esto es parte del cierre de H-005 y no un atajo para cerrarlo.** Si un hallazgo se cerrase
«aceptándolo» sin más, el score dejaría de significar nada: bastaría aceptar todo para sacar un 100. Lo
que legitima este cierre es que **la declaración de valor se corrige a la vez**. H-005 decía que el
producto **prometía** una factura fiscal y no la emitía; a partir de hoy **no la promete**. El hueco entre
lo declarado y lo entregado —que es exactamente lo que mide D1— se cierra por el lado de la declaración,
y queda dicho que se cerró por ahí.

**Lo que NO cambia:** el sistema sigue sin emitir facturas fiscales. Un vendedor con obligaciones ante el
SAT las tiene igual, y `P-012` sigue existiendo como modelo de datos y como stub. **Aceptar una
limitación no la hace desaparecer: la hace explícita.**

**Los tres modelos posibles siguen sobre la mesa** para cuando haya proveedor, medidos en
`docs/implementation/evidence/PT-155/hallazgos.md`. Dos cosas de ahí que conviene no perder:

- **La opción C es subconjunto de la B.** Diferir no cierra puertas en ese sentido; al revés sí — la B
  exige datos fiscales y una autorización legal que **no se pueden pedir retroactivamente** a quien ya
  vendió.
- **La elección decide si el timbrado entra en el camino del dinero.** En B entra; en A y C no.

**Consecuencia para el score:** D1 deja de tener un hallazgo activo. **Y eso hay que leerlo con el
contexto de arriba**: sube porque el alcance se estrechó, no porque se implementara nada.

**Reapertura.** Si v1.1 vuelve a declarar la facturación como producto entregado, `P-012` vuelve al
inventario y H-005 se reabre con él. La decisión está fechada y firmada para que se pueda revisar, no
para que se olvide.

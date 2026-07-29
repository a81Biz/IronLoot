# F7 — Auditoría Documental (Documentary Fidelity)

**Estado**: COMPLETADA  
**Fecha**: 2026-06-23  
**Confidence**: 88%  
**Dimensión principal**: D4 — Documentary Fidelity

---

## Alcance

F7 confronta los documentos en `docs/enterprise-documentation/` contra la realidad observada en código y configuración.

---

## F7.1 — Verificación PRD vs Código

### AC-3.2 — Held funds cannot exceed balance
**Documento**: PRD `02-PRD.md` líneas 57-62  
**Realidad**: `WalletService.holdFunds()` decrementa `balance` e incrementa `held_funds`. Después de una puja, `held_funds > balance` es el estado normal. La restricción real es "no puedes bloquear más de tu balance *disponible en el momento del bloqueo*".  
**Veredicto**: DISCREPANCIA — PRD incorrecto  
**Finding**: H-007 (D4, BAJA, penalización -1)  
**Evidence**: E-008

### AC-1.x — Bid validation rules
**Documento**: PRD AC-1.1 (bid > current price), AC-1.2 (bid > minimum increment)  
**Realidad**: `BidsService.placeBid()` verifica contra `Auction.currentPrice` y usa `BidValidation` de @ironloot/core  
**Veredicto**: ✅ COHERENTE

### AC-2.x — Auction lifecycle
**Documento**: PRD sección Auction Lifecycle  
**Realidad**: `AuctionSchedulerService` avanza estados según cron. Estado machine correcta.  
**Veredicto**: ✅ COHERENTE  
**Excepción parcial**: PRD dice soft-close = `AUCTION_SOFT_CLOSE_WINDOW_SEC` (configurado) pero código real usa 300s hardcoded → ya registrado en H-001 (D1)

### AC-4.x — Payment processing
**Documento**: PRD webhook validation, HMAC  
**Realidad**: Todos los providers implementan HMAC  
**Veredicto**: ✅ COHERENTE

### AC-5.x — Dispute window 14 days
**Documento**: PRD 14-day window  
**Realidad**: `DisputeStateMachine.windowDays` de @ironloot/core  
**Veredicto**: ✅ COHERENTE

### AC-6.x — Security requirements
**Documento**: 09-Security-Architecture.md — BFF pattern, HttpOnly cookies  
**Realidad**: Implementado en server-side, PERO `apiUrl` expuesto al browser → parcialmente degradado  
**Veredicto**: DISCREPANCIA PARCIAL — ya registrado en H-006 (D2)

---

## F7.2 — Verificación TRD vs Código

### Stack tecnológico
**Documento**: TRD — NestJS 10, Prisma 5, PostgreSQL 16, Redis 7, BullMQ 5, Socket.io 4, Node ≥20  
**Realidad**: `package.json` + `docker-compose.yml` confirman estas versiones  
**Veredicto**: ✅ COHERENTE

### ThrottlerModule
**Documento**: TRD y Security Architecture mencionan rate limiting via ThrottlerModule  
**Realidad**: ThrottlerModule sin Redis storage — comportamiento multi-instancia no corresponde al documentado  
**Veredicto**: DISCREPANCIA (ya registrado en H-002, D2)

### Distributed lock
**Documento**: Foundation HANDOFF menciona distributed lock con Redis  
**Realidad**: `lock:auction-close` con TTL 60s confirmado en AuctionSchedulerService  
**Veredicto**: ✅ COHERENTE

---

## F7.3 — Verificación Architecture Docs vs Código

### BFF Pattern (06-Backend-Architecture.md)
**Documento**: "JWT tokens stored in HttpOnly cookies; each site proxies API calls server-side; Client-side JS never has direct access to tokens"  
**Realidad**: Server-side: correcto. Browser: `apiUrl` expuesto → posibles llamadas directas → H-006  
**Veredicto**: DISCREPANCIA PARCIAL (H-006 en D2)

### Module structure
**Documento**: 27 módulos en API  
**Realidad**: Verificado en inventory/services.md — coincide  
**Veredicto**: ✅ COHERENTE

### CFDI / PAC
**Documento**: 02-PRD.md dice "CFDI/PAC is a stub (out-of-scope v1.0.0)" — documentación honesta  
**Realidad**: Confirmado stub  
**Veredicto**: ✅ COHERENTE (la discrepancia es entre realidad y regla de negocio CR-011, no entre doc y código)

---

## Resumen F7

| Sección | Estado | Discrepancias |
|---|---|---|
| PRD AC-3.2 | ❌ INCORRECTO | H-007 (D4, BAJA) |
| PRD resto | ✅ | — |
| TRD stack | ✅ | — |
| TRD ThrottlerModule | parcial | H-002 ya en D2 |
| Architecture BFF | parcial | H-006 ya en D2 |
| Architecture modules | ✅ | — |
| CFDI docs | ✅ (honesto) | — |

---

## Score D4

Penalización:
- H-007: BAJA → -1

**D4 = 100 - 1 = 99**

---

## Update U-004 — DS-004 (2026-07-27)

Las correcciones de PT-109 se sostienen: 0 coincidencias de «la CSP necesita `unsafe-inline`»,
«TOTP opcional» y «Frontends: 0 tests». La guarda `coherencia-deuda-tecnica.spec.ts` pasa 6/6.

**Pero el mecanismo de auditoría documental está roto**: los cinco documentos que
`audit-scope.yaml` declara auditables están gitignored, así que no hay historial que diffear.
Evidencia **E-012**, hallazgo **H-009**. D4 baja de 100 a 95.

---

## Update U-006 — S-002 (2026-07-27): H-009 cerrado, H-016 abierto

### H-009 — comprobado corregido

Los cinco documentos que el alcance declara auditables **están seguidos por git**:

```
CLAUDE.md                                          SEGUIDO
docs/enterprise-documentation/02-PRD.md            SEGUIDO
docs/enterprise-documentation/03-TRD.md            SEGUIDO
docs/enterprise-documentation/09-Security-Architecture.md   SEGUIDO
docs/enterprise-documentation/06-Backend-Architecture.md    SEGUIDO
```

El alcance ya no promete una cobertura que el repositorio impide.

### H-016 — nuevo

`03-TRD.md:13` declara `NestJS ^10.3.0` **citando `src/api/package.json:36`**. Los cuatro servicios
están en `^11.0.0` desde PT-126. `06-Backend-Architecture.md:9-13` repite «NestJS 10» cuatro veces.

Lo que agrava el caso es la cita: el dato falso viene avalado por una referencia a fichero y línea.
Es el mecanismo que CLAUDE.md ya describe para la deuda técnica —«son dos escrituras»— repetido en
otro sitio. Evidencia **E-020**, hallazgo **H-016** (MEDIA, D4, penalización 5).

### Lo que se comprobó y era exacto

| Afirmación | Fuente | Comprobación |
|---|---|---|
| CORE: 8 suites / 134 tests | CLAUDE.md | ejecutado: 8 / 134 ✅ |
| Puertos 3000 · 3001 · 5174 · 5175 | CLAUDE.md | contenedores en marcha ✅ |
| 27 módulos del API | CLAUDE.md | `ls` = 27 ✅ |

### Cobertura declarada de esta fase

**Parcial.** Se verificó la afirmación de versión del framework y tres afirmaciones de CLAUDE.md.
**No** hubo revisión exhaustiva de los cinco documentos. Otras afirmaciones podrían estar
desactualizadas sin medir; queda dicho para que no se confunda con cobertura.

### Score D4 — S-002

```
100 − 5 (H-016, MEDIA, ABIERTA) = 95
```

### Revisión S-002-R2 — una objeción humana, una corrección mía y un hallazgo mayor

**Disparador**: *«sólo se ha trabajado en esta máquina, revisa los commits y las ramas… no puede ser
que la migración no esté documentada. Se migró NestJS 11.1.28 / Express 5.2.1 y debería estar
documentado»*.

#### 1. La objeción era correcta. Corrección de redacción en E-020 y H-016

**La migración a NestJS 11 está documentada, y bien.** PT-126 dejó `REFACTOR_SCOPE.md` (STATE 1-R
completo, con la autorización humana citada literalmente), `CONTEXT_ANALYSIS.md`, entrada detallada
en `HISTORY.log` —incluidos los cuatro defectos latentes que la migración destapó— y `HANDOFF.md`.

E-020 se redactó de forma que podía leerse como «la migración no se documentó». No es lo que se
midió. Son **dos corpus distintos**:

```
docs/implementation/            FDGE — el registro del trabajo        ACTUALIZADO por PT-126
docs/enterprise-documentation/  Foundation Protocol — la referencia   NO actualizado
```

Versiones exactas incorporadas: **NestJS 11.1.28 · Express 5.2.1**, leídas del contenedor. E-020
citaba `^11.0.0`, que es el rango declarado, no la versión resuelta.

#### 2. Verificando las migraciones sobre TODO el historial

`git log --all --diff-filter=A -- 'src/api/prisma/migrations/*'` sobre las **57 ramas** del
repositorio: 23 migraciones, la última `20260726100000_pt086_payment_trace`.

```
git grep -l "AUCTION_SOLD"          $(git rev-list --all) -- 'src/api/prisma/migrations/*'  -> vacio
git grep -l "account_verifications" $(git rev-list --all) -- 'src/api/prisma/migrations/*'  -> vacio
```

**Ningún commit de ninguna rama** tiene esas migraciones. H-014 se confirma sobre el historial
completo, no sólo sobre `master`.

#### 3. La pregunta del Proposal Gate queda resuelta

```
git log --all --format="%an <%ae>" | sort -u   ->  Alberto Martinez <alberto@a81.biz>   (unico)
git rev-parse master origin/master             ->  328b421  ==  328b421
```

Un solo autor, una sola máquina, `master` local idéntico a `origin/master`. **No existe ningún
entorno donde las 23 migraciones se hayan aplicado.** PT-127 puede ir por la **vía B** (colapsar en
una migración inicial), que era la recomendada.

#### 4. Y al comprobar la cita del TRD apareció el hallazgo mayor

Se verificaron las **cinco** filas de la tabla de stack de `03-TRD.md`, no sólo la de NestJS:

```
5 de 5 citas       ->  apuntan a la linea EQUIVOCADA
3 de 5 versiones   ->  son FALSAS
    NestJS      declarado ^10.3.0   real 11.1.28
    Prisma      declarado ^5.8.0    real 5.22.0
    TypeScript  declarado ^5.3.3    real 5.9.3
```

`package.json:36` —la línea que el TRD cita para NestJS— contiene `},`. Las líneas se desplazaron
según crecía el fichero y nadie las siguió.

No es «una fila vieja». Es que **el mecanismo de verificabilidad del documento está muerto**: la
columna de fuente existe para poder comprobar cada afirmación y no permite comprobar ninguna. Un
documento sin citas se lee con desconfianza; uno con citas rotas se lee con confianza y es falso.

**H-016: MEDIA (5) → ALTA (15).** Impacto 2→3. Riesgo 6 MEDIO → **9 ALTO**.

Detalle que conviene no perder: ocho líneas más abajo, el **mismo** `03-TRD.md` dice
`Health check path: GET /api/v1/health` y acierta — contradiciendo a `CLAUDE.md:138`. El dato bueno
ya está en el repositorio, en el mismo fichero que el malo.

#### Scores tras la revisión

```
D4 = 100 − 15 = 85                                  (era 95)
Health = (85×0.30)+(40×0.30)+(100×0.30)+(85×0.10) = 76.0    (era 77.0)  ->  Clase B
Risk_bruto = 6+8+12+9+6 = 41  ->  Risk = 100        (saturado, sin cambio)
Confidence = 90.0                                    (sin cambio)
```

Cerrar los tres hallazgos D2 devuelve el Health a **94.0**; cerrando además H-016, **95.5**. Clase A
en ambos casos.

#### Lo que sigue sin medirse

`02-PRD.md`, `09-Security-Architecture.md` y el resto de `03-TRD.md` y `06-Backend-Architecture.md`
**siguen sin barrer**. La severidad se sube por lo comprobado, no por lo sospechado.

---

## Update U-007 — 2026-07-29 (S-003, delta sync)

**Las cinco rutas de `docs:` de `audit-scope.yaml`, comprobadas una a una.** Cuatro estan rotas:
`02-PRD.md`, `03-TRD.md`, `09-Security-Architecture.md` y `06-Backend-Architecture.md` bajo
`docs/enterprise-documentation/`. **Las archivo PT-141** ayer bajo ADR-049. Solo `CLAUDE.md` sigue en
pie.

Y el comentario `# 23 migraciones — ninguna se ha ejecutado nunca` es falso por partida doble: son
**2** y **las dos estan aplicadas** (verificado en F5/U-007).

Se registra como **H-024** (MEDIA). Es la familia de H-016 aplicada al documento que declara **que se
audita**: una auditoria que dice cubrir cuatro documentos inexistentes declara una cobertura que no
tiene, y `[A8]` hace de la cobertura declarada un requisito del score.

**No se tocan** los 13 ficheros de `PTSA/` que citan las rutas viejas: son registro historico y `[A6]`
los protege — por eso los nueve documentos se archivaron en vez de borrarse. `audit-scope.yaml` es
otra cosa: no es historico, es la declaracion de alcance vigente.

**D4 baja de 100 a 94** (H-024 MEDIA −5, H-023 BAJA −1).

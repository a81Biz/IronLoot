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

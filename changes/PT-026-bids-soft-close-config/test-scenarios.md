# PT-026 — Test Scenarios

---

## TS-026-01: Soft-close con config 120s extiende 120s (happy path)

**Contexto**: Subasta con `endsAt = now + 60s` (dentro de ventana soft-close de 120s). Config devuelve 120.

**Precondición**: `SystemConfigService.getNumber('AUCTION_SOFT_CLOSE_WINDOW_SEC', 120)` mock → 120

**Acción**: `placeBid(userId, auctionId, { amount: 101 })`

**Resultado esperado**: `auction.endsAt` actualizado a `now + 60s + 120s` (extensión de 120s, no 300s)

**Verificación**: `expect(tx.auction.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ endsAt: expectedDate }) }))`

---

## TS-026-02: Bid fuera de soft-close no extiende la subasta

**Contexto**: Subasta con `endsAt = now + 300s` (fuera de ventana soft-close de 120s). Config devuelve 120.

**Precondición**: `SystemConfigService.getNumber('AUCTION_SOFT_CLOSE_WINDOW_SEC', 120)` mock → 120

**Acción**: `placeBid(userId, auctionId, { amount: 101 })`

**Resultado esperado**: `auction.endsAt` se mantiene en `now + 300s` (sin extensión)

---

## TS-026-03: Config personalizada (60s) respetada

**Contexto**: Admin configuró `AUCTION_SOFT_CLOSE_WINDOW_SEC = 60`. Subasta con `endsAt = now + 30s`.

**Precondición**: `SystemConfigService.getNumber('AUCTION_SOFT_CLOSE_WINDOW_SEC', 120)` mock → 60

**Acción**: `placeBid(userId, auctionId, { amount: 101 })`

**Resultado esperado**: Extensión de 60s (no 120s, no 300s) — el valor de config es respetado

---

## TS-026-04: Valor por defecto 120s si config no disponible

**Contexto**: `SystemConfigService.getNumber()` devuelve 120 (valor por defecto).

**Precondición**: DB sin entrada para `AUCTION_SOFT_CLOSE_WINDOW_SEC` → fallback a 120

**Acción**: `placeBid()` con subasta en soft-close

**Resultado esperado**: Extensión de 120s (valor por defecto correcto, no el bug de 300s)

---

## TS-026-05: Regresión — bid rechazado por fondos insuficientes

**Contexto**: `WalletService.holdFunds()` lanza excepción (fondos insuficientes).

**Acción**: `placeBid()` → `holdFunds()` lanza

**Resultado esperado**: Excepción propagada; `SystemConfigService.getNumber()` puede o no haber sido llamado (no crítico, está antes del hold en la ejecución)

---

## TS-026-06: Regresión — no regresión en suite completa

**Acción**: `npm test` desde `src/api/`

**Resultado esperado**: Exit 0, sin failures en ningún test existente. Los tests que crean `BidsService` deben agregar mock de `SystemConfigService` si no lo tienen.

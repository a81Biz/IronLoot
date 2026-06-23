# PT-026 — Out of Scope

---

Los siguientes elementos quedan **explícitamente excluidos** de este PT:

1. **Cacheo del valor de config**: No se implementa ningún mecanismo de cache para `getNumber()`. La llamada se hace una vez por `placeBid()` — overhead mínimo y correcto.

2. **Migración del scheduler**: `AuctionSchedulerService.getSoftCloseWindowSec()` ya es correcto — no se modifica.

3. **DAILY_LIMIT hardcodeado en WalletController**: TD separada, no relacionada con soft-close.

4. **Logs adicionales o métricas en soft-close**: No se agregan logs para la extensión de tiempo más allá del comportamiento existente.

5. **Cambios en WebSocket payload**: El broadcast de WebSocket post-bid no cambia — el `newEndsAt` ya se envía correctamente.

6. **Test de carga / performance**: Verificación del impacto de la llamada async al DB de config en la latencia de `placeBid()`. Considerado aceptable para MVP.

7. **Admin UI para cambiar AUCTION_SOFT_CLOSE_WINDOW_SEC**: Asumido como ya funcional via módulo `system-config`.

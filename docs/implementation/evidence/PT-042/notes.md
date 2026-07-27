# PT-042 — Evidencia (AUD-005, AUD-010, AUD-012, AUD-013)

- **API unit**: 31 suites / **164 tests** verde (incluye commissions 5 + refunds 5 nuevos; scheduler ajustado al arg feePercent).
- **core**: `tsc` build OK; **134 tests** (bajó de 157 al eliminar los 4 use-cases muertos + sus specs).
- **api tsc --noEmit**: exit 0.
- **AUD-005**: `captureHeldFunds(..., feePercent=10)`; el scheduler resuelve `commissionsService.resolveRatePercent(sellerId)` (seller→global→default 10) y lo pasa. Riesgo DI acotado: `SchedulerModule` importa `CommissionsModule` (exporta el servicio; sin ciclo). Validación runtime del settlement recomendada con stack levantado.
- **AUD-012**: eliminado `packages/core/src/application/` + export en index; sin consumidores externos (grep=0).
- **AUD-013**: guards de refunds (over-refund, uno-por-orden, estado no-refundable) y resolución de tasa de comisión cubiertos.
- **AUD-010**: decisión documentada — resolver disputa y ejecutar reembolso son dos pasos intencionales; el Manual de Administrador (docs-v2) ya lo describe. Auto-refund al resolver = enhancement futuro.

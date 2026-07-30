# Modelo Operativo y Decisiones de Producto — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia |
| **Fuente** | `audit/raw/B/D/E`, código de scheduler/wallet/admin, `system-config.service.ts` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 04-App-Flow, 06-Backend, 01-Platform-Overview |
| **Código usado** | `auction-scheduler`, `wallet.service`, `admin`, `system-config` |
| **Nivel de confianza** | Alto |

## 1. Modelo operativo (cómo funciona el negocio, extremo a extremo)

```
Vendedor publica subasta ──► (moderación opcional) ──► ACTIVE
                                                          │
Comprador deposita ──► fondos en Wallet                   │
Comprador puja ──► se BLOQUEAN fondos (held)  ◄───────────┘
   │  (soft-close extiende si es tardía)
   ▼
Scheduler (cada minuto) cierra subastas expiradas (lock Redis):
   • gana la puja más alta ──► Orden PAID
   • captura del ganador (DEBIT_ORDER) ──► crédito al vendedor (CREDIT_SALE) − comisión (FEE_PLATFORM)
   • libera held de perdedores
   ▼
Vendedor registra envío ──► entrega ──► Comprador califica
   │
   └─► (opcional) Disputa dentro de 14 días ──► admin resuelve ──► reembolso (manual)
```

### Palancas operativas (config runtime, `system-config.service.ts`)

| Palanca | Efecto | Default |
|---|---|---|
| `AUCTION_SOFT_CLOSE_WINDOW_SEC` | Ventana anti-sniping | 120 |
| `REQUIRE_AUCTION_MODERATION` | Aprobación admin antes de publicar | false |
| `AUCTION_MIN_INCREMENT_AMOUNT` | Incremento mínimo de puja **(aplicado en `bids.service.ts:92-98`; `AUD-009` corregido)** | 10 |
| `AUCTION_MIN/MAX_DURATION_HOURS` | Límites de duración | 1 / 720 |
| `REQUIRE_EMAIL_VERIFICATION` | Verificación para activar cuenta | true |
| `REQUIRE_KYC_FOR_SELLERS` | KYC para vender | true |
| `PAYMENT_EXPIRATION_HOURS` | Caducidad de orden impaga | 72 |
| `DISPUTE_WINDOW_DAYS` | Ventana de disputa | 14 |

## 2. Decisiones de producto (vigentes)

| ID | Decisión de producto | Justificación / Consecuencia | Evidencia |
|---|---|---|---|
| DP-01 | **Monedero prepago con bloqueo de fondos** en vez de cobro diferido. | Garantiza solvencia del pujador; evita adjudicaciones impagas. | `RN-22`, `BR-02` |
| DP-02 | **Cierre automático por scheduler** (no manual). | Consistencia y escala; requiere lock para multi-instancia. | `ADR-009` |
| DP-03 | **Soft-close anti-sniping.** | Equidad en subastas; extiende ante pujas tardías. | `RN-17` |
| DP-04 | **Comisión configurable por vendedor/global.** | Flexibilidad comercial. **Conflicto:** conviven 10% fijo y configurable. | `AUD-005` |
| DP-05 | **Multi-proveedor de pago** (MP + PayPal + HeyBanco). | Cobertura del mercado MX. HeyBanco no documentado. | `AUD-023` |
| DP-06 | **KYC por revisión manual admin** (sin proveedor externo). | Control directo; menor automatización. | `kyc/` |
| DP-07 | **Moderación opcional** de subastas. | Velocidad por defecto; control activable. | `REQUIRE_AUCTION_MODERATION` |
| DP-08 | **Disputa con ventana fija de 14 días.** | Acota el riesgo temporal de reversión. | `RN-40` |
| DP-09 | **Reembolso operado por admin** (no automático desde la disputa). | Control humano. **Consecuencia:** resolución no mueve dinero sola. | `AUD-010` |
| DP-10 | **Backoffice con un único rol admin.** | Simplicidad; sin separación de funciones (finanzas vs moderación). | `D §5` |

## 3. Modelo de ingresos y flujo de dinero

- **Ingreso:** comisión de plataforma al cierre (asiento `FEE_PLATFORM`).
- **Flujo:** depósito → held (puja) → DEBIT_ORDER (ganador) → CREDIT_SALE (vendedor) − FEE_PLATFORM → retiro (vendedor).
- **Integridad:** todo movimiento queda en el Ledger inmutable (`RN-26`). Reconciliación con proveedores es parcial (`AUD-016`).

> **Decisión pendiente de formalizar (ADR):** la postura CSRF (`AUD-014`) — sigue sin ADR propia. El mecanismo de comisión **ya está unificado** (`AUD-005` corregido en PT-042: el cierre resuelve la tasa con `commissionsService.resolveRatePercent`).

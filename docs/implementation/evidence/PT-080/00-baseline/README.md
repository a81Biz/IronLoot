# PT-080.1 — Línea base

**Fecha**: 2026-07-26 | **Rama**: `feature/PT-080-payment-cycle` (0 cambios de código)

## Suites

| Comprobación | Resultado |
|---|---|
| `npm test` (API) | ✅ 45 suites / **264 tests** |
| `npm test` (CORE) | ✅ 8 suites / **134 tests** |
| `npm run typecheck` | ✅ verde |

## Estado en base de datos

```
balance (comprador_230812) = 5567.50
processed_webhook_events   = 3 filas
ledger DEPOSIT             = 4 asientos
```

Las 3 reservas evidencian F-02 —dos espacios de identificadores conviviendo—:

```
ORDTST01KYEDNWKHXHCS58ZPA3GESWMT   (id de orden)
ORDTST01KYEDQRYCC27CE8JRYR04XG4K   (id de orden)
169718720683                        (id numérico de pago)
```

## Comportamiento actual a batir

| Entrada | Hoy |
|---|---|
| Notificación formato **IPN** (`topic`+`id`) | **HTTP 500** — nunca acredita |
| Notificación formato Webhooks firmada | Acredita |
| Firma inválida | **HTTP 500** |
| Pago aprobado sin notificación | **Se pierde en silencio** |

Estos cuatro son los que PT-080 debe cambiar; los dos últimos renglones de la tabla de la Fase A
y B del `design.md`.

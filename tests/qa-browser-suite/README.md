# QA Browser Suite (Playwright, headed)

Suite de QA por navegador de IronLoot. Ejerce los flujos reales end-to-end (registro, verificación de
email por Mailhog, onboarding vendedor con **KYC obligatorio**, subasta, puja/outbid, depósito real por
Mercado Pago, y el **retiro real del vendedor** PT-069..072) contra la pila local en Docker.

## Requisitos
- Stack levantado: `docker-compose up -d` (API :3000, BASE :5174, CLIENT :5175, ADMIN :3001, Mailhog :8026, db, redis).
- `src/api/.env` con `MERCADO_PAGO_ACCESS_TOKEN` (APP_USR) y `MERCADO_PAGO_WEBHOOK_SECRET` para el flujo MP real.
- `npm install` en esta carpeta (instala Playwright). Navegadores: `npx playwright install`.

## Ejecutar todo desde cero
```bash
bash run-all.sh
```
Resetea la BD (trunca datos), reinicia la API, y corre todas las fases en orden. Salida en
`qa-out/<timestamp>/` (JSON por fase + capturas).

## Fases (se pueden correr sueltas; leen `qa-out/.last-run`)
| Script | Qué valida |
|---|---|
| `00-smoke.cjs` | 57 rutas públicas/guard (crea OUT + `.last-run`) |
| `10-bootstrap.cjs` | Mundo desde cero: admin, comisión, comprador/vendedor, **onboarding + KYC gate + aprobación admin**, subasta, fondeo |
| `20-authed.cjs` | 41 rutas privadas autenticadas |
| `30-e2e.cjs` / `31-outbid.cjs` | Puja real → bloqueo de fondos → outbid → liberación → ledger |
| `40-extras.cjs` | Auth negativa, responsive, CSP, cross-browser (Firefox/WebKit) |
| `50-admin-writes.cjs` | Escrituras admin (SEO/CMS/usuario) con verificación en BD |
| `60-withdrawal.cjs` | **Retiro real:** KYC gate → CLABE → holdback→liberación → solicitud (reserva) → admin aprueba → marca PAID → rechazo reintegra |
| `mp-deposit.cjs <monto> <buyerId>` | **Compra real por Mercado Pago** (Orders API acreditada + webhook HMAC firmado) |
| `hist-check.cjs` | Historial visible de comprador (pujas) y vendedor (subastas) |

## Notas
- Admin API directo con `x-admin-key: dev-admin-key` (ver `AdminDualAuthGuard`).
- El retiro reserva del **saldo disponible**; el neto de venta entra a `pendingBalance` (holdback) y se
  libera a disponible por entrega o vencimiento de disputa (14d). Ver reglas RN-62..67 en `docs-v2`.
- El origen del dinero del retiro se siembra en BD replicando el camino cubierto por pruebas unitarias
  (`settlement.spec`, `withdrawals.service.spec`); el subsistema de retiro se ejerce REAL vía API.
- Modo headed por decisión de producto (`config.cjs: HEADED=true`).

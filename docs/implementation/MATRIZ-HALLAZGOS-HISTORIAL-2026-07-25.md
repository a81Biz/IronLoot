# Matriz de Hallazgos — Historial no se muestra → FDGE (2026-07-25)

**Origen:** verificación empírica de historial tras la corrida completa. Las páginas cargan (200) pero
**no muestran los datos** aunque existen en BD. Mismo patrón de contrato CLIENT↔API que PT-058/059.
**Excluido por decisión del usuario:** el flujo incompleto de retiro/dispersión del vendedor (NO se toca).

**Estados:** `PENDIENTE` · `STATE 1..7` · `VALIDATION_PENDING` · `CLOSED`.

## Cola de procesamiento

| # | PT | Páginas afectadas | Causa raíz | Sev | Tipo | Archivo |
|:--:|:--:|---|---|:--:|---|---|
| 1 | **PT-067** [STATE 7 · VALIDATION_PENDING] | `/orders` (compras), `/auctions/won-auctions`, `/seller/orders` | API `/orders` devuelve **array** `[{...}]`; plantillas esperan `.items` → vacío | ALTA | BUG | CLIENT `app.controller.ts` + helper |
| 2 | **PT-068** [STATE 7 · VALIDATION_PENDING] | `/seller/auctions` | CLIENT llama `?role=seller` (la API usa `?mine=true`) + API devuelve `.data` (plantilla espera `.items`) | ALTA | BUG | CLIENT `app.controller.ts` + helper |

## Evidencia (empírica)
- `/orders` muestra "Sin órdenes registradas" con 1 orden PAID en BD; `/api/v1/orders?role=buyer` SÍ devuelve `[{totalAmount:3000,...}]`.
- `/auctions/won-auctions` "No has ganado subastas" con 1 ganada.
- `/seller/orders` "Sin pedidos" con 1 venta PAID.
- `/seller/auctions` "No tienes subastas" con 1; `/api/v1/auctions?role=seller`→`{data:[],total:0}`, pero `?mine=true`→`{data:[1],total:1}`.
- `/my-bids` sí muestra (fix previo PT-059).

## Fuera de alcance (NO tocar)
- Retiro/dispersión del vendedor (`/wallet/withdraw`): requiere método de pago + no dispersa dinero real. **Excluido.**

## Cierre
**2026-07-25** — PT-067/068 procesados (helper toItems + mine=true), tests 14/14, evidencia navegador. Todo el historial (comprador y vendedor) se muestra. Retiro del vendedor EXCLUIDO por decisión del usuario.

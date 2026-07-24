# User Story Mapping e Historias — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia |
| **Fuente** | `audit/raw/B/D`, `transversal/Catalogo-Maestro-de-Casos-de-Uso.md` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 02-PRD, 04-App-Flow, 05-UIUX |
| **Código usado** | controllers de api/base/client/admin |
| **Nivel de confianza** | Alto |

## 1. Story map (columna = actividad; fila = prioridad)

```
ACTIVIDAD →   Descubrir      Financiar        Competir          Cerrar/Recibir      Resolver          Operar
────────────────────────────────────────────────────────────────────────────────────────────────────────────
Backbone      Explorar       Depositar        Pujar             Ganar → Orden       Abrir disputa     Moderar
              catálogo       en wallet         subasta           → Pagar/Enviar      → Resolver        → Reportes

Walking       Ver detalle    Registrar        Ver mis pujas     Registrar envío     Solicitar         Configurar
skeleton      subasta        método de pago   / watchlist       / calificar         reembolso         comisiones/KYC

Later         Buscar/filtrar Retirar saldo    Recibir alertas   Historial de        Adjuntar          Campañas /
                                              tiempo real (WS)  órdenes             evidencia         CFDI / reconcil.
```

**Estado por columna:** Descubrir ✅ · Financiar ⚠️ (auth UI, `AUD-003`) · Competir ✗ (sin UI puja/WS, `AUD-002`) · Cerrar/Recibir ✅ backend · Resolver ⚠️ (`AUD-010`) · Operar ⚠️ (CFDI `AUD-016`).

## 2. Historias de usuario (formato Connextra) con criterios

| ID | Historia | Criterio de aceptación (Given/When/Then) | Estado |
|---|---|---|---|
| US-01 | Como visitante quiero registrarme para participar. | Dado email nuevo, cuando registro y verifico, entonces mi cuenta queda ACTIVE. | ✅ |
| US-02 | Como comprador quiero depositar para poder pujar. | Dado un pago verificado, cuando el webhook confirma, entonces mi wallet acredita el monto verificado. | ⚠️ AUD-003 |
| US-03 | Como comprador quiero pujar para ganar un lote. | Dada subasta activa y saldo, cuando pujo por encima del actual, entonces se bloquean mis fondos y lidero. | ✗ AUD-002 |
| US-04 | Como comprador quiero que una puja tardía extienda la subasta. | Dada puja dentro de 120s del fin, cuando pujo, entonces `endsAt` se extiende. | ✅ backend |
| US-05 | Como ganador quiero que se genere mi orden automáticamente. | Al cierre, cuando lidero, entonces se crea orden PAID y se captura mi depósito. | ✅ backend |
| US-06 | Como vendedor quiero publicar y gestionar subastas. | Dado isSeller, cuando creo/publico desde DRAFT, entonces queda PUBLISHED. | ⚠️ AUD-003 |
| US-07 | Como vendedor quiero registrar el envío y cobrar. | Dada orden PAID, cuando registro envío y se entrega, entonces cobro (CREDIT_SALE − comisión). | ✅ |
| US-08 | Como comprador quiero calificar tras recibir. | Dado envío DELIVERED, cuando califico, entonces se guarda mi rating a la contraparte. | ✅ |
| US-09 | Como usuario quiero abrir una disputa si algo falla. | Dentro de 14 días de entrega, cuando abro disputa, entonces queda OPEN. | ⚠️ AUD-003 |
| US-10 | Como admin quiero resolver disputas y reembolsar. | Cuando resuelvo a favor del comprador, entonces se reembolsa. | ✗ AUD-010 |
| US-11 | Como admin quiero configurar la comisión por vendedor/global. | Cuando fijo una tasa, entonces se aplica a la venta. | ⚠️ AUD-005 |
| US-12 | Como finanzas quiero emitir CFDI por orden. | Cuando genero CFDI, entonces obtengo factura timbrada. | ✗ AUD-016 |
| US-13 | Como admin quiero ver KPIs de ingresos y usuarios. | Cuando abro el dashboard, entonces veo ingresos/altas por día. | ✅ |
| US-14 | Como usuario quiero recibir notificaciones de mis pujas/órdenes. | Cuando soy superado/gano, entonces recibo notificación. | ✅ (in-app) |

## 3. Releases sugeridos (alineados al Roadmap de Negocio)

- **MVP operable:** US-03 (puja UI), US-02/US-06/US-09 (auth escrituras), US-12 (CFDI). → Hito 0 del [Roadmap](../1-negocio/Roadmap-y-Riesgos.md).
- **Integridad financiera:** US-05/US-07/US-10/US-11 endurecidos con tests y comisión unificada.
- **Operación completa:** campañas, reconciliación, reportes fiscales.

# out-of-scope.md — Tanda FPGE-004 · PT-204 … PT-232

Lo que esta tanda **no** hace, dicho por adelantado para que no se descubra a mitad ni se lea como olvido.

## 1. Bloqueado por decisión ajena al equipo

| Qué | Por qué | Dónde queda anotado |
|---|---|---|
| **El texto de los documentos legales** (términos, privacidad, cookies) | Redactar cláusulas es asesoría jurídica. `PT-219` entrega los ocho riesgos `L-01`…`L-08` como insumo y la mitad de interfaz | `PT-219.2` = `BLOCKED` |
| **Facturación CFDI** | Falta contratar un PAC (`TD-001`, `AUD-016`). `P-012` está `FUERA_DE_ALCANCE_V1` por decisión humana fechada | Sin cambio |
| **Stripe y HeyBanco en producción** | Credenciales y contratos externos (`TD-002`) | Sin cambio |
| **Dispersión bancaria automática** | `RN-67`, Fase 2 declarada. `PT-216` entrega el flujo **manual** que `RN-66` describe | Sin cambio |

## 2. Decisiones de producto que la tanda resuelve retirando, no inventando

Las tres están razonadas en `design.md §3` (D-1, D-2, D-3). Se listan aquí porque **son pérdida de
funcionalidad aparente** y alguien las echará en falta:

- **Categorías de subasta.** El modelo `Auction` no tiene el campo. Se retiran los seis enlaces de
  categoría del catálogo. Reintroducirlas exige decidir la taxonomía y migrar el esquema: es un PT propio.
- **Filtro «Cerradas».** El API prohíbe por diseño exponer subastas cerradas en modo público. Publicar el
  histórico es una decisión de negocio.
- **Filtro «solo vendedores verificados».** Exponer el estado KYC de una persona en un DTO público es una
  decisión de privacidad. `PT-225` deja visible la **reputación**, que es la señal equivalente y ya es
  pública por diseño.

## 3. Fuera de alcance por naturaleza

- **Rediseño visual.** La auditoría lo excluyó explícitamente y la tanda lo respeta: se corrigen
  contraste, jerarquía y consistencia **dentro** del sistema de diseño existente (`docs/design/Modo_Luz.md`).
  No se cambian paleta, tipografía ni composición.
- **Alinear la implementación con `Index.png`/`list.png` sección por sección.** Se toman de esos diseños
  los elementos que la auditoría identificó como **ausencias funcionales** (cuenta atrás, watchlist,
  contadores, ayuda). El resto de la divergencia visual se documenta en `PT-232`, no se implementa.
- **Modo oscuro.** No existe implementación que auditar; `Modo_Oscuro.md` describe una aplicación futura.
- **Multi-moneda, tracking de transportista en vivo, roles admin granulares.** Fuera de alcance declarado
  del producto (`PRD §4`).
- **Subir D5 del 0 %.** Exige volumen de ciclos de pago reales, no código (S-013 §SIGUIENTE·1).

## 4. Lo que esta tanda NO puede prometer

**Que el Health suba de 100.** No se puede retirar una penalización que nunca se aplicó: los 62 hallazgos
no están registrados como `H-XXX`. El cierre de la tanda incluye un `audit PTSA` para que la mejora sea
medible, y **hasta que ese sync ocurra, el número no lo demuestra**.

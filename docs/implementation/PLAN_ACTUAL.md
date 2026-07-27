# PLAN_ACTUAL — PT-115: la ventana de disputa se mide desde la entrega (H-011)

**Fecha**: 2026-07-27 · **Tipo**: BUG · **Complejidad**: STANDARD · **Estado**: STATE 2
**Entrada**: `DISCOVERY.md` § PT-115 · PTSA H-011

---

## 1. Objetivo

Que la ventana de 14 días se cuente desde la entrega, que es lo que `CR-007` declara y lo que el
propio comentario del código promete.

**No hay ninguna decisión de dominio que tomar aquí.** La regla ya está escrita en F-1; lo que falta
es que el código la cumpla. Es distinto de F-40, donde la regla no existía en ningún sitio.

## 2. Solución propuesta

### 2.1 El dato se lee donde está

`orders` no tiene `delivered_at`. **`shipments` sí**, y se puebla: `shipments.service.ts:105-106`
la escribe al marcar `DELIVERED`.

El repositorio ya lo sabe en otro sitio — `ratings.service.ts:40` lee `order.shipment.status`.

```ts
const referenceDate: Date = order.shipment?.deliveredAt ?? order.updatedAt;
```

Y la consulta del pedido incluye el envío, que hoy no incluye.

### 2.2 Los `as any` desaparecen

Son la razón por la que esto compiló durante meses. Sin ellos, el compilador vuelve a proteger: un
campo que no existe deja de ser `undefined` silencioso y pasa a ser un error.

### 2.3 El respaldo se conserva, y se explica

`shipment` es una relación **opcional** (`Shipment?`): un pedido puede estar `DELIVERED` sin envío
registrado. En ese caso se sigue usando `updatedAt`.

No es lo ideal, pero es honesto y es lo único disponible. Lo que cambia es que ahora **es un
respaldo declarado**, no la única rama que se ejecuta.

## 3. Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Añadir `delivered_at` a `orders`** | Duplica un dato que ya existe en `shipments`, con dos sitios que pueden divergir. Es el mismo error que H-010 con la comisión |
| **Exigir envío para disputar** | Cambia una regla de negocio que nadie ha pedido cambiar. Un pedido sin envío también puede tener problemas |
| **Corregir el comentario y `CR-007`** para que digan «desde la última modificación» | Sería documentar el defecto en vez de arreglarlo. Y «14 días que se reinician solos» no es una promesa que se pueda hacer a un comprador |
| **Dejarlo** | La ventana es una promesa al comprador y hoy es elástica sin que nadie lo sepa |

## 4. Análisis de regresión

| Qué | Riesgo | Cómo se comprueba |
|---|---|---|
| **Disputas que hoy se aceptan y dejarían de aceptarse** | **Alto y real**: un pedido entregado hace 20 días pero modificado ayer hoy admite disputa; después, no. Es el defecto, pero es un cambio de comportamiento visible | Tests con ambos casos, y queda dicho en el commit |
| Pedidos sin envío | Que el `?.` no cubra bien el caso | Test explícito |
| La consulta del pedido | Incluir el envío cambia la forma del objeto | Suite del API |
| Las disputas existentes | Ninguna: sólo cambia la validación al crear | Fase `e2e` |

## 5. Criterios de éxito

1. Con envío entregado hace 20 días → **rechaza**, aunque el pedido se haya tocado hoy.
2. Con envío entregado hace 2 días → **acepta**, aunque el pedido lleve meses sin tocarse.
3. Sin envío → sigue usando `updatedAt`, y hay un test que lo fija.
4. **Cero `as any`** en esa expresión.
5. `npm test` y suite completa en verde.

## 6. Restricciones

- Tests en RED antes (RULE-06).
- No se añade `delivered_at` a `orders`: el dato ya existe.
- H-011 **no se cierra**: lo cierra el humano.

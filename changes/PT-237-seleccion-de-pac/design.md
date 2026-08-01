# PT-237 — Diseño: la selección del PAC se declara, no se simula

**Tipo:** BUG · **Complejidad:** STANDARD · **Rama:** `fix/PT-237-seleccion-de-pac`
**Discovery:** `docs/implementation/DISCOVERY.md` § PT-237

## Autorización

> «revisa que no falte nada. sólo puede faltar lo de la selección del proveedor de facturas, trabaja
> bajo el marco de trabajo establecido para cada cosa que falte y trabaja hasta que no falte nada.»

## Objetivo

Que el sistema **no pida una decisión que no puede recibir**, y que **no escriba un estado que nadie
puede avanzar**. Sin fingir una integración que sigue siendo una dependencia externa.

## La decisión de diseño, en una frase

**Un PAC se elige de un conjunto declarado; hoy ese conjunto está vacío, y eso se dice.**

Es la diferencia entre *«configura la URL de tu PAC»* —que sugiere que cualquier URL funcionará— y
*«no hay ningún PAC integrado: la facturación no puede activarse»*, que es verdad y es accionable.

## Decisiones, con su alternativa rechazada

### D-1 — Un registro de PAC, con el mismo patrón que las pasarelas de pago

`CfdiPacRegistry` con `all()`, `available()` y `resolve(clave)`, poblado por inyección igual que
`PaymentProviderRegistry`. **Hoy se registra cero adaptadores**, y esa cifra es la respuesta honesta a
«¿qué PAC puedo elegir?».

**Rechazado:** escribir un adaptador de ejemplo (`FacturamaProvider`, `SwSapienProvider`). Sin contrato
con el PAC ni credenciales no se puede probar contra nada real, y un adaptador que no se ha visto
funcionar **es** la clase de defecto que este PT corrige. Además ADR-058 ya lo dejó dicho: *un contrato
sin implementador no es código muerto, es documentación falsa ejecutable*.

### D-2 — `CFDI_PAC_PROVIDER` sustituye a `CFDI_PAC_URL` como decisión

La clave del proveedor pasa a ser lo que se elige; la URL, un detalle de ese proveedor. La
configuración **valida contra el registro**: una clave que no esté registrada se rechaza al guardar.

`CFDI_PAC_URL` y `CFDI_PAC_API_KEY` se conservan —son la configuración de un adaptador cuando lo
haya—, pero dejan de ser la puerta de entrada.

**Rechazado:** dejar la URL libre y validar sólo el formato. Un `https://` bien formado que apunte a
cualquier sitio pasa igual, y volvemos a aceptar una decisión que no se puede honrar.

### D-3 — Activar la facturación exige un PAC disponible

`CFDI_ENABLED=true` sólo se acepta si `available()` no está vacío. Sin esto, el interruptor enciende un
subsistema que no puede funcionar, que es lo que hace hoy.

**Y el mensaje nombra el motivo**, no el síntoma: *«no hay ningún PAC integrado»*, no *«error de
configuración»*.

### D-4 — `generate()` no escribe un estado que nadie avanza

Se retira el `upsert` a `PENDING` previo al `throw`. Si no hay PAC, el registro queda en `ERROR` con el
motivo —que es lo que la otra rama del método ya hacía— y **el contador del panel deja de crecer sin
destino**.

**Rechazado:** dejar `PENDING` y añadir un cron que caduque las filas. Sería construir maquinaria para
mantener un estado que no debería escribirse.

### D-5 — La instrucción dice la verdad

El mensaje deja de citar `ICfdiPacProvider (@ironloot/core integrations)` —retirado entero por PT-193,
`TD-024`— y pasa a nombrar lo que existe: registrar un adaptador en `CfdiPacRegistry`, y `TD-001` como
el sitio donde vive la decisión.

### D-6 — La pantalla ofrece una lista, y dice por qué está vacía

`cfdi-config.html` sustituye el campo de texto por un `<select>` alimentado por el registro. Con cero
proveedores, el select está vacío y **el aviso explica que es una dependencia externa**, citando
`TD-001`. Es `RULE-41` aplicado: el control dice lo que pasa.

## Lo que este PT NO hace

- **No integra ningún PAC.** Sigue siendo `TD-001`: exige un PAC certificado, contrato y credenciales.
- **No cambia el esquema.** `cfdi_records` se queda como está.
- **No toca el PRD.** Ya es honesto: E10 `✗ No funcional`, `RF-81` stub. `ADR-061` se cumple.

## Análisis de regresión

| Qué puede romperse | Por qué no |
|---|---|
| El panel de CFDI (`/cfdi`) | Sólo lista y cancela; no toca `generate()` |
| `getCfdiConfig()` en ADMIN | Gana un campo (`proveedores`), no pierde ninguno |
| Pedidos ya completados | La facturación nunca formó parte del cierre de un pedido |
| Filas `PENDING` existentes | Se miden antes de tocar nada; si las hay, se nombran en la evidencia |

## Criterios de éxito

1. Activar CFDI sin PAC disponible **falla nombrando el motivo**.
2. Guardar una clave de PAC no registrada **se rechaza**.
3. `generate()` sin PAC **no deja ninguna fila en `PENDING`**.
4. Ningún mensaje de tiempo de ejecución del módulo nombra un símbolo o paquete inexistente.
5. Las cuatro cosas anteriores tienen guarda, con caso de control en las dos direcciones.

# PT-155 — H-005: quién emite la factura

**INVESTIGATION.** No implementa, y **no puede**: cierra `CLOSED` con hallazgos documentados.
**H-005 sigue `ABIERTA` y D1 sigue en 85.**

## Por qué ningún PT lo resuelve

Dos cosas que no están en el repositorio:

1. **Contratar un PAC** certificado ante el SAT. Es un contrato con un tercero.
2. **Decidir el modelo fiscal.** Y esta es la que de verdad bloquea.

`PTSA/PENDIENTES.md` lo dice desde S-001. Lo que aporta este PT es traducir la decisión de negocio a
sus **consecuencias técnicas**, para que se tome informada y el trabajo posterior sea promovible.

## Las tres opciones, y qué cambia cada una en el código

Las opciones son de `F-1 § U-005` (PT-113). Lo que sigue es lo que ninguna de las dos fuentes decía:
**qué habría que construir en cada caso.**

### A) El vendedor emite

Cada vendedor con su propio PAC y su e.firma. IronLoot no factura la venta.

| Impacto | Qué |
|---|---|
| Modelo de datos | `CfdiRecord` pasa a ser **referencia externa**: guarda el UUID fiscal que el vendedor aporta, no un comprobante propio. Sobra casi todo el modelo actual |
| Onboarding | Un campo nuevo por vendedor: si emite o no. **No** hacen falta sus datos fiscales completos |
| Liquidación | Sin cambios |
| Riesgo | El comprador puede quedarse sin factura y la plataforma no puede garantizarla. **Es un problema de producto, no técnico** |
| Coste | **El menor** |

### B) IronLoot emite por cuenta del vendedor

| Impacto | Qué |
|---|---|
| Modelo de datos | Datos fiscales **completos** del vendedor: RFC, régimen, domicilio, uso de CFDI. Hoy no se piden en ningún sitio |
| Onboarding | **Autorización expresa** del vendedor, versionada y con fecha — es un documento legal, no una casilla |
| KYC | Se acopla: no se puede facturar por cuenta de quien no está verificado |
| Liquidación | El timbrado entra en el camino del dinero. **Si el PAC falla, ¿se liquida igual?** Esa pregunta hay que responderla antes de escribir una línea |
| Riesgo | El más alto. Un error de timbrado es un problema **fiscal**, no un 500 |
| Coste | **El mayor** |

### C) IronLoot factura sólo su comisión

| Impacto | Qué |
|---|---|
| Modelo de datos | `CfdiRecord` cuelga de `CommissionRecord`, no de `Order`. Los datos fiscales son **los de IronLoot**, que ya se conocen |
| Onboarding | Sin cambios |
| Liquidación | Timbrado **asíncrono**, fuera del camino del dinero: si falla, se reintenta y nadie se queda sin cobrar |
| Riesgo | El menor. No cubre la venta entre particulares |
| Coste | **Medio-bajo**, y es lo único enteramente bajo control de la plataforma |

## Lo que la investigación aporta y no estaba escrito

**Las tres no son igual de reversibles.** C es un subconjunto de B: si se elige C y luego se quiere B,
lo construido sirve. Al revés no — B exige recoger datos fiscales de cada vendedor y una autorización
legal, y eso **no se puede pedir retroactivamente** a quien ya vendió.

> **Si la decisión va a tardar, C es la opción que no cierra puertas.**

Y hay algo que se decide con ella sin querer: **si el timbrado entra o no en el camino del dinero.**
En B entra; en A y C no. Esa es la diferencia técnica de fondo, más que el modelo fiscal en sí — y
este repositorio ya aprendió lo que cuesta poner algo frágil en la ruta de un pago (ADR-038: un ciclo
declarado cerrado antes de que el dinero llegara al usuario).

## Por qué `CR-011` no es auditable hoy

Dice que *«toda transacción gravable debe producir un `CfdiRecord` válido»* y **no dice de quién es la
obligación**. Una regla de dominio que no nombra al obligado no se puede auditar: no hay forma de
saber si un `CfdiRecord` ausente es un incumplimiento o el comportamiento correcto.

Por eso H-005 mantiene D1 en 85 y P-012 en `IDENTIFICADO`, y por eso ningún PT lo cierra.

## Lo que hace falta para desbloquear

| Quién | Qué |
|---|---|
| **Negocio** | Elegir A, B o C |
| **Fiscal / legal** | Validar la elección; en B, redactar la autorización del vendedor |
| **Después** | Contratar el PAC, y **entonces** un PT de implementación con alcance conocido |

## Estado

`CLOSED` — investigación completa. **H-005 sigue abierta.** Cerrar el PT no cierra el hallazgo: son
cosas distintas, y confundirlas sería exactamente el tipo de cierre falso que PT-140 vino a impedir.

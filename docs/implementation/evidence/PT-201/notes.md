# PT-201 — evidencia

## Cómo apareció

**No lo encontró esta suite.** Salió de la extracción de graphify sobre `docs/enterprise-documentation/`:
un lector ajeno leyó `integrations.md` entero y señaló cuatro rutas que no existen. Las guardas del
repositorio estaban en verde con el defecto delante.

Es el punto 4 de las «Siguientes» de `HANDOFF.md` —*buscar guardas que miran al lado del agujero*—
cumpliéndose sobre una guarda escrita **el día anterior**.

## Lo medido

```
$ ls src/packages/core/src/integrations/
ls: cannot access ...: No such file or directory        (PT-193 / ADR-058 lo retiró)

$ grep -rl "interface IPaymentProvider|IEmailService|IStorageService|ICfdiPacProvider" --include=*.ts src/
src/packages/core/dist/...    <- SOLO restos de compilación, y dist/ no está en git
```

| Línea | Decía | Es |
|---|---|---|
| 25 | `IPaymentProvider` en `core/src/integrations/` | vive en `src/api/src/modules/payments/interfaces/` |
| 54 | `IEmailService` | **no existe** — `EmailService` es clase concreta |
| 120 | `IStorageService` | **no existe** — `upload` escribe al FS sin abstracción |
| 130 | `ICfdiPacProvider` | **no existe** — `cfdi.service.ts` es un stub |
| 77 | almacén del rate limiter «TBD, see TD-002» | `ND-002`, **cerrada por PT-171**: existe desde PT-030 |

**Tres de las cuatro no tenían sustituto, y ése es el dato.** Se retiraron porque **nadie las
implementaba**. Un inventario que las llama «Interface» promete una capa de abstracción inexistente:
quien planee cambiar de almacén o contratar un PAC leerá que hay un contrato donde hay una llamada
directa. Y la quinta línea convertía en pendiente algo resuelto hace nueve días.

## Por qué la guarda no lo veía

`C6` (PT-198) lee **sólo la línea `**Source:**`**. Estrecharla fue deliberado: la primera versión leía
los primeros 800 caracteres y **acusaba a la nota que explica la corrección**, que tiene que nombrar el
directorio retirado para que se entienda.

**El estrechamiento resolvió el falso positivo y creó el hueco.** La cabecera quedó vigilada y el cuerpo
—donde vivían las cuatro— no.

`C7` lee ahora el cuerpo entero, con dos acotaciones **medidas antes de escribirlas**:

1. **Líneas de cita (`>`) excluidas** — una nota sobre el pasado no es una afirmación sobre el presente.
2. **Sólo rutas ancladas en la raíz** — mi primera medición acusó **78 líneas** de `routes.md` y
   `services.md` que citan rutas *relativas a una base declarada* (`modules/users/users.controller.ts`) y
   son correctas. Comprobarlas contra el directorio de trabajo es medir la forma en vez de la cosa.

## Y el control se puso rojo por un listón inventado

`AC-08` exigía **más de 20** rutas ancladas. Hay **17** (components 5 · integrations 6 · services 3 ·
entities 2 · routes 1 · endpoints 0). Puse el 20 a ojo y el control falló con el corpus entero delante.
Bajado a **10**, que no es 17 a propósito: fijarlo en el número exacto obligaría a tocar la prueba con
cada cita nueva, y una guarda que estorba es una guarda que se acaba retirando.

## Verificación

```
guardas de documentación:  19 suites / 203 pruebas
suite completa del API:   138 suites / 1132 pruebas
```

`C7` visto **fallar** con las cuatro rutas nombradas una a una, y pasar tras corregirlas.

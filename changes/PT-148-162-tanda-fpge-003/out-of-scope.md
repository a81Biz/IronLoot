# Fuera de alcance — tanda PT-148 … PT-162

Lo que esta tanda **no** hace. Declararlo es parte de la propuesta: un alcance sin borde explícito se
ensancha solo.

## No se toca dinero

**Ningún PT de los quince entra en monedero, pagos, ledger, comisiones ni liquidación.** Es
deliberado: la tanda anterior (PT-142, PT-145, PT-146) trabajó ahí y sus once cierres son de ayer.
Mezclar quince cambios de instrumentación con la ruta del dinero multiplicaría el riesgo sin ninguna
necesidad.

## No se cierran hallazgos

`[R44]`. H-021, H-022, H-023 y H-024 llegarán a **CORREGIDA**, con evidencia. Cerrarlos es tuyo.

## No se decide por ti

- **PT-155** no elige quién emite la factura. Documenta las tres opciones y sus consecuencias.
- **PT-156** no abre `/users/:id/ratings`. Escribe los criterios de las tres alternativas.

## No se corrige lo que los instrumentos nuevos encuentren

**PT-150** construye el escáner de imagen base; las vulnerabilidades que reporte son trabajo posterior
con su propia evidencia. **PT-151** es una investigación: si encuentra un caso del patrón de H-019,
abre PT propio — un `INVESTIGATION` informa, no arregla.

Meterlo todo aquí convertiría una tanda acotada en una de alcance desconocido.

## No se mide D1 ni D5

Necesitan una base **con historia**, y eso es una corrida `run-all.sh` + medición inmediata: trabajo
**PTSA**, no FDGE. Va **después de PT-153**, o se vuelve a medir a medias. Queda anotado en
`PENDING_TASKS.md`, no dentro de ningún PT de esta tanda.

## No se poda el repositorio

Las 82 ramas locales ya fusionadas siguen ahí. Borrarlas no lo pidió nadie.

## No se ejecuta `[START FOUNDATION]`

PT-141.B sigue siendo decisión tuya. **PT-154 va antes**: hoy nada mecánico impide que una ejecución
de Foundation deshaga ADR-049.

## No se empuja a origin

Los commits quedan locales salvo que lo pidas.

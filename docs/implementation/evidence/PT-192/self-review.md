# PT-192 — Self-Review (FDGE STATE 5)

**Objetivo:** medir los **15 `AUD` con veredicto «sin verificar»** —los que quedaban tras PT-191— y
cerrar cada uno con evidencia. La instrucción fue explícita: *«es necesario cerrar los 15 AUD»*.

## El resultado, y lo que dice de no medir

**Diez ya estaban corregidos y nadie lo sabía. Cinco seguían abiertos.**

Eso es lo que cuesta dejar una casilla en «no lo sé»: no es sólo no arreglar, es **no saber qué está
arreglado**. Dos tercios de la lista eran trabajo ya hecho que seguía figurando como incógnita, y con
ellos se arrastraba el único que importaba de verdad.

| Hallazgo | Veredicto | Lo medido |
|---|---|---|
| **AUD-015** | **abierto → corregido** | El grave. Ver abajo |
| **AUD-026** | **abierto → corregido** | `JWT_SECRET \|\| ""` en el CLIENT: fallaba cerrado **en la petición, no en el arranque** |
| **AUD-031** | **abierto → corregido** | CHANGELOG parado desde el 12-ene; ADR-057 lo hace apuntar a `HISTORY.log` |
| **AUD-034** | **abierto → corregido** | Cinco versiones divergentes que **no significaban nada**; ADR-056 las unifica |
| **AUD-035** | **abierto → corregido** | Las cookies sobrevivían a sus tokens; ahora derivan de ellos |
| AUD-019 · 020 · 021 · 022 · 024 · 028 · 029 · 032 · 033 · 036 | ya corregidos | Medidos uno a uno; ninguno requería tocar nada |

## AUD-015: una regla de dominio armada que decía lo contrario del sistema

`CR-002` decía *«los fondos retenidos no pueden superar el balance disponible»* —
`wallets.held_funds <= wallets.balance`. Y aquí **retener resta del balance y suma a `held_funds`**: son
bolsas disjuntas. Un usuario con 100 que puja 100 queda en `balance = 0`, `held = 100` y **viola la
invariante comportándose correctamente**.

Lo que la hacía peligrosa no es que estuviera escrita: es que estaba **codificada en el checkpoint
D1.N1 con severidad CRÍTICA**, lista para acusar al sistema de un fallo inexistente. No saltó nunca
porque ese checkpoint necesita una base con historia — **un control que no se ejecuta no avisa de
nada**, y aquí eso fue exactamente lo que lo escondió durante meses.

Y `RN-21` ya decía lo correcto **desde PT-032**. Las dos afirmaciones convivían y **la equivocada era la
que se ejecutaba**.

## Lo que salió de medir y no estaba en ningún enunciado

- **La sesión efectiva del portal dura quince minutos.** El API expone `POST /auth/refresh`, BASE guarda
  el token de refresco con su cookie de 30 días… y **no hay un solo llamante**. El mecanismo que existe
  para que la sesión dure siete días está escrito y no está cableado → **TD-025**.
- **`variableObligatoria()` mentía al usarse para un secreto.** Su mensaje decía siempre *«es una
  variable de conexión: sin ella el sitio no sabe a dónde llamar»*, lo que habría mandado a mirar URLs
  cuando falta el `JWT_SECRET`. El motivo es ahora un parámetro.

## Checklist

- [x] **Los 15 medidos uno a uno** contra código, base y documentos. Ninguno se declaró corregido por
      lectura del enunciado.
- [x] **Tests-first**: las tres guardas nuevas escritas en RED (7 casos fallando).
- [x] **Las tres vistas fallar por su propio motivo**: sabotaje dirigido de las tres correcciones →
      6 casos caen, cada uno el suyo.
- [x] Casos de control en los dos sentidos en las tres.
- [x] Sin regresiones: **1076 pruebas / 133 suites** en el API.
- [x] La guarda de RULE-38 encontró **sola** las tres líneas que estos cierres dejaron obsoletas.
- [x] Dos decisiones registradas como ADR (056 versionado, 057 changelog), con su alternativa
      descartada y su criterio de revisión.

## Cinco falsos positivos míos, porque también son evidencia

Mi primera medición dio cinco veredictos equivocados, **todos por medir la forma en vez de la cosa**:

1. **AUD-022** — mi regex cogió *«Admin dashboard with 18 feature modules»* en vez de la línea del API.
   Los 27 cuadran.
2. **AUD-028** — conté `--prefix` en el hook; el `pre-commit` recorre los **cinco** proyectos con un
   bucle y `lint-staged`.
3. **TD-015/TD-017** — los di por abiertos porque escriben `**Status: CERRADA` con los dos puntos
   dentro de la negrita.
4. **RN-64 / RN-64b** — los conté como duplicados comparando por prefijo. Son dos reglas.
5. **AUD-035 «corregido»** — el único documento que «reconciliaba» los ejes era el propio registro de
   hallazgos, es decir, el sitio donde consta el defecto.

Los cinco los cacé releyendo con desconfianza mis propios veredictos. Es el mismo patrón que este
repositorio lleva toda la jornada corrigiendo, y esta vez estaba en la medición, no en el código.

## Y tres veces una guarda se acusó a sí misma

`citas-de-fichero-existen`, `regla-critica-coincide-con-el-codigo` y `secreto-de-sesion-obligatorio`
acusaron al fichero **corregido**, porque el comentario que explica el defecto tiene que citar la forma
que había. Las tres se arreglaron igual: **se mide lo ejecutable, no lo que se explica**. El patrón ya
tiene nombre — *una guarda que nombra lo que vigila forma parte del corpus que vigila*.

## Estado

Los cinco corregidos son **BUG**: `VALIDATION_PENDING`. El agente no cierra bugs (FDGE STATE 6).

# PT-141 — Evidencia

## Lo que se midió antes de tocar nada

**Dos árboles de documentación declarándose mutuamente sustitutos:**

| | `docs/enterprise-documentation/` | `docs-v2/` |
|---|---|---|
| Generado | 23-jun-2026 (Foundation Protocol 1.0) | 23-jul-2026 |
| Se declara | *«Toca regenerar. Decisión del humano»* | *«la única fuente de verdad»* |
| Citas vinculantes en `CLAUDE.md` | **10** | **1** |

Y **los dos se escribían en el mismo commit**: `6decb1a` y `4f40358` tocan ambos árboles. Cada PT
pagaba la escritura dos veces, y la divergencia no era un riesgo sino una cuestión de calendario.

**Citas rotas en `CLAUDE.md`** — barrido automático de las 47 rutas citadas:

```
NO EXISTE: PTSA/Motor-PTSA.md
NO EXISTE: PTSA/PTSA.md
```

Ninguno de los dos ha existido **nunca** (`git log --all -- PTSA/Motor-PTSA.md` → vacío). Era un
pendiente desde **DS-004**, repetido en cinco bloques de `PTSA/PENDIENTES.md` a lo largo de cuatro
sesiones, siempre con «responsable: humano».

## Lo que apareció al mirar, y no estaba en el plan

Elevar `11-Conventions.md` a contrato único obligaba a comprobar que dice lo que el código cree. **No
lo decía:**

```
$ grep -oE 'RULE-[0-9]+' docs/enterprise-documentation/11-Conventions.md | sort -uV
RULE-01 … RULE-17 RULE-19 RULE-20 RULE-22 RULE-23 RULE-24

$ grep -rn "RULE-25\|RULE-26" --include=*.ts src/
src/api/src/modules/wallet/account-verification.service.ts:90:   * necesita migración. → **RULE-25**
src/api/test/unit/persistencia/creacion-perezosa-atomica.spec.ts:89:      //     (RULE-25, PT-145).
src/api/test/unit/despliegue/dockerfiles-citados-existen.spec.ts:6: * PT-147 (RULE-26) — …
```

**RULE-25 y RULE-26 estaban citadas en código de producción, en guardas y en evidencia, y ninguna de
las dos existía en el documento.** Un agente que siguiera la cita hasta el contrato no habría
encontrado nada. Es H-016 aplicado al documento que gobierna a quien toca el repositorio: no es que
falte información, es que **hay una referencia precisa que no lleva a ninguna parte**.

Segundo hallazgo, del mismo tipo: `contexto-de-construccion.spec.ts` **no podía ejecutarse dentro del
contenedor**. Calculaba la raíz contando cinco `..` desde `/app/test/unit/documentacion`, lo que da
`/`, y moría con `ENOENT` antes del primer `it`. Era el último fichero que quedaba contando `..`
después de PT-137. Una guarda que no arranca no acusa nada — el patrón más repetido de este
repositorio.

Tercero: `10-Technical-Debt.md` (TD-005) **se contradecía dentro del mismo bloque**. Abría con
*«CERRADA DEL TODO … en ninguna directiva»* y tres líneas después afirmaba *«Queda `styleSrc`, que
sigue llevándolo»*. La segunda frase era prosa de antes de PT-105 que sobrevivió a la actualización
del estado — la forma exacta de F-33.

## Antes / después

| | Antes | Después |
|---|---|---|
| Árboles de documentación oficiales | 2, mutuamente sustitutos | 1 (`docs-v2/`) + 1 contrato de agente acotado |
| Citas vinculantes en `CLAUDE.md` a `enterprise-documentation/` | 10 (todas a documentación de producto) | 4 (todas a `11-Conventions.md`) |
| Rutas citadas en `CLAUDE.md` que no existen | 2 | 0 |
| `RULE-NN` citadas en código y ausentes del contrato | **2** | 0, y vigilado |
| Reglas declaradas en `11-Conventions.md` | 21 | 24 |
| Documentos de `enterprise-documentation/` sin equivalente y por tanto conservados | — | 3, verificado documento a documento |
| Guardas de documentación que no arrancan en contenedor | 1 | 0 |

## Suite

```
$ docker compose exec api npx jest --no-coverage --runInBand
Test Suites: 1 failed, 101 passed, 102 total
Tests:       1 failed, 785 passed, 786 total
```

El fallo es **RULE-20 C2**, acusando a PT-141 de tener carpeta de evidencia sin entrada en
`HISTORY.log`. **Es correcto**: la entrada se escribe en STATE 7, y que la guarda lo cace mientras
tanto es exactamente lo que PT-140 construyó. Queda en verde tras el paso 7 — comprobado abajo.

De las 786, **9 son nuevas** (la guarda RULE-27, con seis casos de control).

### Guardas de documentación, dirigidas

```
PASS test/unit/documentacion/reglas-citadas-existen.spec.ts        (RULE-27, nueva)
PASS test/unit/documentacion/coherencia-documentacion-codigo.spec.ts
PASS test/unit/documentacion/coherencia-deuda-tecnica.spec.ts
PASS test/unit/documentacion/contexto-de-construccion.spec.ts      (antes no arrancaba)
```

Que `coherencia-documentacion-codigo` siga en verde es la comprobación que más importaba de todo el
PT: **las nueve citas `fichero:línea` del TRD siguen verificando desde `archive/`**. Se reapuntó la
guarda en vez de dejar de mirar. Archivarlo no lo hace menos verificable; dejar de comprobarlo sí
habría devuelto H-016 con aval, que es precisamente el riesgo que este PT existía para no correr.

## La guarda se acusó a sí misma

RULE-27 falló en su primera ejecución señalando `RULE-18`, `RULE-21`, `RULE-27` y `RULE-99` — todas
nombradas por sus propios casos de control y su propio docblock. **Es la undécima vez que pasa en
este repositorio.**

No se exceptuó el fichero. Se le enseñó que **un bloque `casos de control` construye contraejemplos
en vez de citarlos**, que es una regla y no una exención: vale para cualquier guarda futura que
necesite nombrar algo inexistente, y no abre agujero porque el código de producción no tiene bloques
de casos de control. Queda como AC-06.

`RULE-18` y `RULE-21` resultaron ser huecos legítimos: se reservaron en paquetes de propuesta
(`b361970`) y sus reglas acabaron plegadas en otras. Quedan declarados así en RULE-27, con el motivo
de no rellenarlos: **inventar una regla para tapar un número es escribir para el linter**.

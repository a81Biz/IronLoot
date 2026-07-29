# PT-169 — Self-Review (STATE 5)

**Fecha**: 2026-07-29 · **Tipo**: BUG · **Complejidad**: STANDARD
**Hallazgos que cierra**: F-167-C, F-167-E, F-167-F

## Qué se hizo

| Defecto | Arreglo |
|---|---|
| **PT-167 sólo existía en su mensaje de commit** | Entrada en `HISTORY.log` con su contenido real, **al final** con su fecha — no se reordena un log append-only |
| **PT-166 sin evidencia** | `evidence/PT-166/` con la corrida completa ejecutada: termina sin OOM, 2 GB y `--max-old-space-size=1536` verificados dentro del contenedor |
| **PT-167 sin evidencia** | `evidence/PT-167/`: el servicio `nginx-tls` existe, el perfil `tls` resuelve, y **sin el perfil no se levanta** |
| **PT-166/167 fuera del registro de pendientes** | Los dos en `PENDING_TASKS.md` y `HANDOFF.md` como `VALIDATION_PENDING`. Son BUG: el agente no los cierra |
| **Las dos direcciones sin vigilar** | **RULE-34** — `rastro-de-trabajo-completo.spec.ts`, 17 pruebas |

## Tres correcciones a mi propio hallazgo, y todas a la baja

Esto es lo que más vale de este PT, así que va primero.

**1. «Nueve PT sin evidencia» eran dos.** Contar carpetas `evidence/PT-XXX/` una a una ignora que
`HISTORY.log` usa **cabeceras agrupadas** con una carpeta **por grupo**. Siete de los nueve estaban
cubiertos. Perseguirlos habría creado siete carpetas para satisfacer una métrica mal definida — trabajo
real gastado en un hallazgo falso. Corregido en `DISCOVERY.md § F-167-E` **antes** de actuar.

**2. C1 acusaba a treinta PT antiguos.** Tres VoBo históricos son **declaraciones de totalidad**
(«toda la validación pendiente», «dalos a todos por validados»), no enumeraciones. La salida no fue un
corte arbitrario —«aplicar la regla desde PT-140» habría sido un tope silencioso disfrazado de
umbral— sino recorrer la historia **en orden cronológico**, que es lo que un log append-only permite y
exige. Tras el cambio, C1 acusaba **exactamente PT-166**: el defecto real.

**3. C2 no admite ventana limpia.** De 131 grupos, **34** no tienen evidencia, repartidos por toda la
historia (PT-026 … PT-145). Fabricarla desde la descripción de un PT sería **inventar ejecución**, y
FDGE dice que la evidencia *es* la ejecución. Se declaran en `evidence-baseline.json` con el criterio de
`security-baseline.json`: **la lista sólo baja**.

## Dos fallos de la guarda, cazados por la guarda

- **Clave vacía**: las entradas sin PT en cabecera (`## CIERRE CON VoBo HUMANO`) no son trabajo y no
  deben exigir evidencia. Fijado en **AC-10**.
- **Claves divergentes**: la línea base se generó sin expandir rangos (`PT-124/PT-126`) y la guarda los
  expandía (`PT-124/PT-125/PT-126`), así que la fila declarada **no casaba con nada**. Una línea base
  cuya clave se calcula de dos formas distintas no declara nada. Fijado en **AC-11**.

## Evidencia

| Fichero | Qué prueba |
|---|---|
| `guarda-RED.txt` | La guarda **vista fallar**: C1 acusa PT-166, C2 acusa los grupos sin evidencia |
| `guarda-GREEN.txt` | Después: **17/17** |
| `../PT-166/verificacion.txt` | La corrida completa de PT-166 sin OOM, con el límite y `NODE_OPTIONS` leídos del contenedor |
| `../PT-167/verificacion.txt` | `nginx-tls` declarado, perfil `tls` resuelto, y ausente sin el perfil |

## Checklist

- [x] Guarda **vista fallar** antes de arreglar (RULE-14)
- [x] 11 casos de control, incluidos los dos fallos propios (AC-10, AC-11) y el orden (AC-09)
- [x] `HISTORY.log` **no reordenado**: PT-167 se añade al final con su fecha real (RULE-20)
- [x] Evidencia **ejecutada**, no redactada
- [x] La línea base no cubre PT-166 ni PT-167 — lo vigila C4
- [x] RULE-34 declarada, en el Delta Log, y añadida a `test:guardas`
- [x] PT-166 y PT-167 **no se cierran**: son BUG y los cierra una persona (STATE 6)

## Lo que queda fuera, dicho explícitamente

- **Los 34 grupos de la línea base** siguen sin evidencia. Están **contados y a la vista**, y la lista
  sólo puede bajar. No se rellenan aquí porque escribirla sin ejecutar sería inventarla.
- `HISTORY.log` cita `evidence/PT-026/` y `evidence/PT-046/`, que nunca existieron. **Append-only: no
  se edita.** La cita viva que colgaba de ahí la arregla PT-170.

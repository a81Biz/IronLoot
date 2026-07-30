# PT-195 — Evidencia

## Las dos guardas, antes

```
FAIL test/unit/documentacion/rastro-de-trabajo-completo.spec.ts
  ● C2: ningun grupo NUEVO se queda sin evidencia
    + Array [ "PT-106", "PT-107", "PT-108", "PT-111" ]

FAIL test/unit/documentacion/evidencia-citada-esta-en-git.spec.ts
  ● C4: ninguna cita a carpeta apunta a un directorio inexistente
    + "docs/implementation/evidence/PT-153 — citada en /PTSA/Hallazgos/H-022.md, no existe"
```

## Después

```
Tests: 32 passed, 32 total     (las dos suites)
Tests: 1076 passed, 1076 total (API completa, 133 suites)
```

## Vistas fallar tras el arreglo

No basta con que pasen: hay que verlas caer, o el arreglo podría ser un silenciamiento.

| Sabotaje | Resultado |
|---|---|
| Retirar `evidence/PT-106/` | RULE-34 C2 **cae** |
| Apuntar la cita de `H-022` a una carpeta que no existe | RULE-31 C4 **cae** |
| Restaurar ambos | 32/32 en verde |

## Lo que NO se hizo, y es lo que importa

**No se re-ejecutó nada.** La evidencia de PT-106/107/108/111 se trasladó **literalmente** desde la
prosa que `HISTORY.log` ya contenía, y cada `notes.md` lo dice en su cabecera. Rehacer las
comprobaciones semanas después y presentarlas como la evidencia original sería peor que no tenerla:
convertiría un hueco declarado en una afirmación falsa.

**No se amplió la línea base.** `evidence-baseline.json` sólo puede bajar (`C3`), y eso es deliberado:
la salida prevista ante un hueco es añadir evidencia, no declarar más excepciones. Añadir cuatro
entradas habría dejado la guarda verde y el rastro igual de incompleto.

## Lo que no se pudo determinar

**Desde cuándo fallaban.** Fallan con el `HISTORY.log` de ayer y en el commit anterior, así que no las
rompió el trabajo de hoy. Pero durante la jornada reporté «1076 en verde» varias veces y **no he
conseguido reproducir aquel verde**. Queda escrito como incógnita en vez de como explicación.

> **Nota.** La fila de arriba **describe** el sabotaje en vez de citar la ruta inventada: la guarda de
> RULE-31 lee las citas a carpeta de todo documento, y acusaba —con razón— a este mismo fichero por
> nombrarla. Es la cuarta vez en la jornada que una guarda caza el texto que explica lo que vigila.
> **Una guarda que nombra lo que vigila forma parte del corpus que vigila.**

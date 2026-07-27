# PT-103 — design.md

**BUG · STANDARD · F-33** · Entrada: `DISCOVERY.md` § PT-103 · `PLAN_ACTUAL.md`

## La decisión de fondo

Cerrar una deuda toca dos sitios y sólo uno está obligado:

```
PT cierra una deuda
   ├─► codigo         no compila si te equivocas
   ├─► HISTORY.log    FDGE STATE 7 lo exige
   └─► el registro    NADA lo obligaba   ← el hueco de F-33
```

PT-090 corrigió el registro. Tres PT después volvía a mentir, y lo hice yo. La conclusión no es
«hay que tener más cuidado»: es que **la disciplina sin mecanismo caduca**.

## D1 — La guarda cruza `HISTORY.log` con el registro

`HISTORY.log` sirve de referencia porque es **append-only** y FDGE obliga a escribir en él. El
registro no está obligado por nada. La guarda hace que lo esté.

## D2 — Estrecha a propósito

Sólo reconoce formas explícitas: la línea `Deuda cerrada: …` en la historia, y el primer
`**Status:**` bajo `### TD-XXX` en el registro. Cerrado: `CERRADA|CLOSED|MITIGADA|RESUELTA`.
Abierto: `Open|Acknowledged`. Cualquier otra redacción **no se acusa**.

Es una decisión deliberada sobre el tipo de error preferible. Un falso negativo deja pasar una
incoherencia; un falso positivo hace que alguien borre la guarda. Lo segundo es peor: se pierde
también todo lo que sí protegía.

## D3 — Se salta cuando los documentos no están

`docs/` está en `.gitignore`. Un test que exigiera esos ficheros fallaría en cualquier clon limpio
y en CI, por una razón que no es un defecto — y el primero que viera ese rojo lo borraría.

**Limitación, dicha en voz alta**: la guarda protege a quien tiene los documentos. Que es
exactamente quien puede desincronizarlos, así que sigue valiendo la pena. Pero no es una red que
cubra a todo el que clone el repositorio, y conviene no creerse lo contrario.

## D4 — Las filas se comprueban contra el código

No contra `HISTORY.log`. Si la historia dijera que algo está cerrado y el código dijera que no, lo
correcto es un hallazgo nuevo, no copiar la afirmación. Es lo que hizo PT-090 y por eso aguantó.

## Lo que este PT NO hace

- No toca `HISTORY.log` (append-only).
- No introduce un fichero de datos del que generar ambos documentos: elimina el problema de raíz,
  pero convierte prosa que la gente lee en salida generada. Desproporcionado para una deuda D4.
- No arregla F-35 (`QA-PP-09`).
- No cierra el bug.

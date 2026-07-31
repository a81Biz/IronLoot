# PT-202 — evidencia

## El defecto

`PTSA/ESTADO_ACTUAL.md` declaraba `Freshness: FRESH — commits_since_audit = 0`. La especificación define
ese estado sin margen: **es una afirmación sobre git**, y por tanto medible. **No se medía.**

Y ha fallado **dos veces en dos meses**:

| Sync | Se declaraba | Encima tenía | Lo encontró |
|---|---|---|---|
| `S-010` | `FRESH` | **28 commits · 6 PT**, con migración de esquema y cambios de autenticación | `PT-197`, leyendo |
| `S-011` | `FRESH` | 1 fichero del alcance (`PT-200`) | **yo, leyendo** |

Dos veces a mano es una clase sin guarda.

## Lo medido

```
auditable_patterns: 27   ignore_patterns: 11
ficheros cambiados desde edebe36 (emisión de S-011): 22

DENTRO del alcance: 1
   docs/enterprise-documentation/10-Technical-Debt.md
FUERA: 21  — *.spec.ts, docs/implementation/**, PTSA/**, changes/**, evidencia, tsconfig.json
```

**Ningún código de producción cambió.** Y aun así es `STALE`: la regla no pregunta si el cambio mejoró el
documento —el de PT-200 lo mejoró: declaró el hueco `TD-018…023` y el recuento real—. **Una regla que
dejara al autor decidir si su propio cambio cuenta no sería una regla.**

## Lo que hizo falta para que fuera comprobable

El documento **no decía desde qué commit** se medía. Sin ancla, «commits_since_audit = 0» no se puede
contradecir: no hay contra qué contar. Ahora declara `audit_commit: edebe36…`, y eso convierte la frase
en falsable.

## La guarda, vista en los dos sentidos

**Rojo, con el estado real:**

```
✕ C1  Received: null          (no declaraba audit_commit)
✕ C2  ✕ C3
✓ AC-01  ✓ AC-02  ✓ AC-03  ✓ AC-04
```

**Sabotaje verificado** —se comprobó que el reemplazo se había aplicado antes de ejecutar nada, que es
la lección de la jornada— poniendo `FRESH` con el commit real:

```
✕ C2: si declara FRESH, ningun patron auditable cambio desde entonces
    + Array [
    +   "docs/enterprise-documentation/10-Technical-Debt.md",
    + ]
```

Acusa **exactamente** el fichero que la medición manual había encontrado.

**Verde** con `STALE` declarado. Y `AC-04` mide contra `S-010` (`c53d7aa`) para que el detector no pueda
filtrar de más sin que se note: si eso diera vacío, `C2` no acusaría nunca.

## Lo que NO se hizo

**No se recalcularon Health, Risk ni Confidence.** Corregir la frescura es medir commits; reemitir una
puntuación exige un delta sync, y PTSA sólo se activa con su disparador explícito. Inventar el número
sería lo que `[A1]` prohíbe.

La consecuencia queda escrita: `freshness` pesa **0.25** en la Confianza (FRESH 100 · STALE 50), así que
el **91.0** se calculó con un insumo que ya no se sostiene. Por `[A8]`, el score no es válido hasta el
próximo sync.

## Y la guarda de ayer me cazó a mí

Al añadir esta suite, `handoff-es-estado-actual.spec.ts § C3` se puso roja: `HANDOFF.md` seguía
declarando **19** guardas de documentación y ya eran **20**. Escrita ayer, cobrada hoy, contra su autor.

## Verificación final

```
guardas de documentación:  20 suites / 210 pruebas
suite completa del API:   139 suites / 1139 pruebas
```

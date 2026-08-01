# Evidencia — BUG — La portada dice lo que el sistema hace (H-UI-027/028/041)

**Fecha:** 2026-07-31 · **Rama:** `fix/PT-204-contrato-forma-de-lista`

## Las tres afirmaciones, contra su regla

| Afirmacion | Regla que la contradice |
|---|---|
| «Socios y aliados estrategicos: … DHL, FedEx» | `RN-35`: «Sin integracion de transportista real» |
| «fondos retenidos hasta confirmar la entrega» | `RN-30` (captura al cierre) y `RN-64` (lo retenido es del vendedor) |
| `<form action="#">` que recoge un correo | `main.ts:57`: «BASE has no SSR POST routes» |

## RED

`afirmaciones-del-sitio.spec.ts` acusa las tres. Sus cuatro casos de control prueban las dos direcciones,
incluido C3: **la guarda no se acusa a si misma** leyendo el comentario que explica el defecto.


## Corrida de suites que lo verifica

Las tres suites se ejecutaron tras cada commit de la tanda. Cifras de la ultima corrida (2026-07-31):

```
API  test/unit/web-views     8 suites ·  64 pruebas · verde
CLIENT                      13 suites · 156 pruebas · verde
BASE                         4 suites ·  23 pruebas · verde
typecheck CLIENT / BASE / ADMIN: sin errores
```

## Self-Review (STATE 5)

- [x] Criterio del Proposal Package verificado con prueba, no por lectura.
- [x] Sin efectos colaterales: las suites previas siguen en verde.
- [x] `11-Conventions.md` respetado — sin JS ni `style=` en plantillas, sin `<script>` en linea.
- [x] Commit atomico, trazable al PT.
- [x] Sin artefactos de depuracion.

## Lo que esta evidencia NO demuestra

Que la pantalla se vea con datos reales. La base esta vacia (`total: 0`, medido) porque `run-all.sh` la
trunco. Lo demostrado es que el contrato coincide y que una guarda falla si deja de coincidir. La
comprobacion con datos exige `run-all.sh` + la suite de navegador, y esta anotada en `HANDOFF.md` como
primera accion recomendada — se declara en vez de darse por hecha.

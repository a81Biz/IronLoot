# Evidencia — BUG — Contraste y distincion visual (H-UI-033/034/035)

**Fecha:** 2026-07-31 · **Rama:** `fix/PT-204-contrato-forma-de-lista`

## Numeros medidos, no estimados

| Elemento | Antes | Umbral AA | Ahora |
|---|---:|---:|---:|
| Precio (`--cl-gold` #C89B3C sobre blanco) | **2,56:1** | 3,0 (texto grande) | **5,05:1** |
| Prosa legal (`#6B7280` sobre #F6F6F6) | **4,47:1** | 4,5 | **5,53:1** |
| `--cl-gold-dark` (#a8832e), descartado | 3,53:1 | 4,5 | — |

Los tres numeros se reproducen como casos de control en `contraste-de-texto.spec.ts`, que **calcula** la
razon con la formula de WCAG 2.1 en vez de confiar en una revision visual.

## Lo que NO cambia

`--cl-gold` se conserva para bordes, fondos, iconos y texto sobre oscuro: sobre Iron Black su contraste
es holgado y la prueba lo comprueba. Lo que estaba mal no era el color, era usarlo para texto sobre
blanco. La identidad de `docs/design/Modo_Luz.md` queda intacta.


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

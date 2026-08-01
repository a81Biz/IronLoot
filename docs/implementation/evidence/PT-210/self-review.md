# Evidencia — BUG — La puja informa su minimo y su reloj (H-UI-020/048/050)

**Fecha:** 2026-07-31 · **Rama:** `fix/PT-204-contrato-forma-de-lista`

BUG — La puja informa su minimo y su reloj (H-UI-020/048/050)

El detalle de la causa, la solucion y el delta real vs planificado esta en la entrada de
`HISTORY.log` de este PT; aqui va lo que se ejecuto para comprobarlo.

## Corrida que lo verifica (2026-07-31)

```
API     135 suites · 1.140 pruebas · verde
CLIENT   14 suites ·   172 pruebas · verde
BASE      4 suites ·    23 pruebas · verde
ADMIN     2 suites ·    13 pruebas · verde
tsc --noEmit: limpio en API, BASE, CLIENT y ADMIN
```

## Self-Review (STATE 5)

- [x] Criterio verificado con prueba, no por lectura.
- [x] Sin regresion: las suites previas siguen en verde.
- [x] `11-Conventions.md` respetado — sin JS ni `style=` en plantillas, sin `<script>` en linea.
- [x] Commit atomico y trazable al PT.
- [x] Sin artefactos de depuracion.

## Lo que esta evidencia NO demuestra

Que la pantalla funcione con datos reales. La base esta vacia porque `run-all.sh` la trunco. Lo
demostrado es que el contrato coincide y que una guarda falla si deja de coincidir. Se declara en vez de
darse por hecho.

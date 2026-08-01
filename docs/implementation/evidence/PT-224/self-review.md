# Evidencia — BUG — Las dos 404 vuelven al sistema de estilos real (H-UI-036/062)

**Fecha:** 2026-07-31 · **Rama:** `fix/PT-204-contrato-forma-de-lista`

## Que se midio antes

Doce clases de DaisyUI en las dos 404 y **cero** coincidencias en `base.css` (1.182 lineas) y
`client.css` (805), comprobado clase por clase. El framework se retiro por ADR-002 y el marcado se quedo.

## GREEN

`clases-css-existen.spec.ts` recorre las plantillas de los dos sitios. Ademas de las doce, encontro
cuatro clases huerfanas mas: `badge-muted` y `detail-main` (se definen) y `auction-detail` y `bid-panel`
(se retiran del marcado — `caja-oscura` y `ancho-820` ya hacian ese trabajo).

**Y volvio a saltar mientras se escribia PT-205**, sobre una clase nueva. Es exactamente lo que tiene que
hacer: proteger el codigo que aun no existe.


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

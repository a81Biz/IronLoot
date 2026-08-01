# Evidencia — BUG — El saldo pendiente de liquidacion llega a la interfaz (H-UI-011)

**Fecha:** 2026-07-31 · **Rama:** `fix/PT-204-contrato-forma-de-lista`

## Que se midio antes

`wallet.controller.ts:50-56` devuelve `pending`, documentado en el DTO como «ventas sin liquidar
(holdback)». `WalletBalanceRaw` declaraba **cuatro** campos y `mapWalletBalance` construia la vista sin
el: el dato llegaba del API y se tiraba antes de ninguna plantilla.

## RED

`wallet-view.spec.ts` W4 y W5 fallan contra el mapeador anterior:
`Expected: pending_balance 12500 · Received: (ausente)`.

## GREEN

W1-W5 en verde. W2 —un caso de PT-058— se actualizo porque el contrato cambio de verdad, no para que
pasara: su entrada no trae `pending`, asi que resuelve a 0 y no a `undefined`.


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

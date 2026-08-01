# Evidencia — FEATURE — Publicar y cancelar una subasta (H-UI-007)

**Fecha:** 2026-07-31 · **Rama:** `fix/PT-204-contrato-forma-de-lista`

## Que se midio antes

`grep -rn "publish" src/apps/client/views src/apps/client/public/js` -> **0 resultados**. No existia
ninguna accion de publicar en toda la interfaz. El endpoint `POST /auctions/:id/publish` existe y su
unico invocador era la suite de QA, por `fetch` desde la consola (`10-bootstrap.js:196`).

## Que se entrega

Acciones «Publicar» y «Cancelar» en «Mis subastas», con confirmacion previa —las dos son irreversibles en
la practica— y propagacion del mensaje del servidor: el API distingue «no eres el dueño», «no esta en
borrador» y «transicion invalida» (RN-11, `AuctionStateMachine`), y cada uno se corrige distinto.

## Verificado

La guarda `clases-css-existen.spec.ts` (PT-224) **acuso este PT mientras se escribia**, por usar
`.accion-subasta` y `.fila-acciones` sin definirlas. Es la guarda haciendo su trabajo sobre codigo nuevo,
no sobre codigo viejo.


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

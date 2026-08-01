# Evidencia — BUG — Estados, badges y fechas en el idioma del usuario (H-UI-037/038/045/052)

**Fecha:** 2026-07-31 · **Rama:** `fix/PT-204-contrato-forma-de-lista`

## Que se midio antes

Nueve tablas imprimian el enum crudo. `docs-v2/7-ux/FAQ-y-Mensajes.md §3` fija las etiquetas en español
para las cinco entidades: existia un contrato terminologico escrito y la interfaz emitia el identificador
interno. El sitio publico **si** traducia.

## GREEN

`estados.spec.ts`: 12 casos. Incluye la guarda de reincidencia —«todo `{{ x.status }}` pasa por
`| estado`»— con sus dos casos de control, y la comprobacion de que **toda variante emitida existe como
clase** en `client.css`.

Decision registrada: ante un estado desconocido se devuelve el **valor**, no un hueco. Un hueco es el
silencio que esta tanda persigue.


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

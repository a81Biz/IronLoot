# Evidencia — BUG — ADMIN sin reservas de conexion (H-UI-063, hallazgo nuevo)

**Fecha:** 2026-07-31 · **Rama:** `fix/PT-204-contrato-forma-de-lista`

## El hallazgo

`ADMIN_API_URL` se leia con `|| "http://localhost:3000"` en **tres** ficheros de ADMIN, y la guarda de
`H-035` recorria ADMIN entero sin verlo **porque esa variable no estaba en su lista**.

Es la reaparicion que `S-013 §SIGUIENTE·4` dejo escrita palabra por palabra:

> *«la lista de variables de conexion de la guarda es su limite, y ya mordio una vez. Cualquier variable
> nueva que apunte a un servicio hay que añadirla ahi — no hay nada que lo recuerde.»*

Mordio la segunda vez. **Declarar una debilidad no la cierra.**

## RED

Con `ADMIN_API_URL` añadida a `VARIABLES_DE_CONEXION`, `conexiones-sin-reserva.spec.ts` acusa:

```
src\admin\src\app.controller.ts: ADMIN_API_URL (linea 18)
src\admin\src\app.service.ts: ADMIN_API_URL (linea 8)
src\admin\src\shared\admin-api-client.service.ts: ADMIN_API_URL (linea 8)
```

El tercero solo aparecio tras corregir los dos primeros: la guarda va acusando de uno en uno.

## Procedencia

El hallazgo **no** estaba en la auditoria de interfaz. Aparecio al leer ADMIN durante PT-218. Se le asigno
PT propio en vez de colarlo en otro, y entra en la cola de FPGE-005.


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

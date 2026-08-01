# Evidencia — BUG — El registro alcanzable desde el detalle publico (H-UI-009)

**Fecha:** 2026-07-31 · **Rama:** `fix/PT-204-contrato-forma-de-lista`

## Que se midio antes, en vivo

```
GET http://localhost:5175/auth/register  ->  404
```

El CTA apuntaba a `{{ clientUrl }}/auth/register` y el registro vive en BASE; el portal privado solo
declara `/auth/logout`.

## RED

`enlaces-entre-sitios.spec.ts` acusa `pages/auctions/detail.html: {{ clientUrl }}/auth/register — esa
ruta la sirve BASE, no el portal`.

## GREEN

Enlace relativo a BASE. La guarda cubre las diez rutas que sirve BASE, porque `clientUrl` se interpola en
catorce sitios y que el destino sea correcto no lo dice el compilador.


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

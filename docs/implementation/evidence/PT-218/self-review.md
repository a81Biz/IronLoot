# Evidencia — BUG — El backoffice deja de apuntar a localhost (H-UI-040/060/061)

**Fecha:** 2026-07-31 · **Rama:** `fix/PT-204-contrato-forma-de-lista`

## Que se midio antes

`src/admin/views/layouts/admin.html` llevaba `<a href="http://localhost:5174">Ver sitio</a>`, presente en
las **28** pantallas del panel. `CLAUDE.md` (PT-088) lo prohibe: *«Nunca escribir un `localhost:<puerto>`
en una URL que salga del sistema»*.

## GREEN

`PUBLIC_SITE_URL` derivada de `PUBLIC_*` en `docker-compose.yml`, como `BASE_URL` en base y client, y
declarada como **global de Nunjucks**: pasar el mismo valor en 28 `render` garantiza que el 29 se olvide.
`rel="noopener noreferrer"` en el unico `target=_blank` del sistema.


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

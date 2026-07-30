# PT-194 — test-scenarios.md

Los **11 escenarios** del enrichment, con dónde se comprueba cada uno y qué lo haría fallar.

| # | Escenario | Dónde | Qué lo haría fallar |
|---|---|---|---|
| 1 | Token expirado + refresh válido → página servida | PT-194.4 | Que el guard no distinga expiración, o no continúe tras refrescar |
| 2 | Lo mismo con `fetch` a `/api/v1/...` → 200 | PT-194.7 | Que el proxy no reintente |
| 3 | Token fresco → **cero** llamadas a `/auth/refresh` | PT-194.4 (`E-1`) | Refrescar por defecto en vez de sólo ante expiración |
| 4 | Refresh **revocado** → login, cookies borradas | PT-194.4 | Tratar `null` como error recuperable |
| 5 | Refresh **expirado** (>7 d) → login, cookies borradas | PT-194.4 | Igual que 4 |
| 6 | Usuario **suspendido** → login | PT-194.1 | Que el CLIENT decida el estado en vez de leer el 401 del API |
| 7 | **Sin** cookie de refresco → login, cero llamadas | PT-194.4 (`CA-5`) | Llamar al API con `undefined` |
| 8 | Cinco concurrentes → **un** refresco | PT-194.2 (`E-2`) | No compartir la promesa, o agrupar por usuario |
| 9 | API caído/lento al refrescar → login, sin cuelgue | PT-194.3 | No declarar tope; `fetch` espera indefinidamente |
| 10 | Refresco devuelve **500** → fallo, no éxito silencioso | PT-194.1 | Tratar `!res.ok` como `null` sin distinguir |
| 11 | `access_token` **manipulado** → sigue rechazándose | PT-194.4 + PT-194.10 (`CA-11`) | Refrescar ante cualquier fallo de `verify` |

## Y dos que no vienen del enrichment: los puso el diseño

| # | Escenario | Dónde | Por qué |
|---|---|---|---|
| 12 | Una respuesta **200** normal atraviesa el proxy idéntica | PT-194.8 (`E-3`) | `selfHandleResponse` cambia **toda** respuesta, no sólo los 401 |
| 13 | Tras refrescar, `apiGet` de **esa misma petición** usa el token nuevo | PT-194.5 | Sin esto la página carga **vacía**, sin error y sin traza |

## Cómo se prueban los relojes sin esperar quince minutos

**No se espera: se firma un token ya expirado** con el mismo `JWT_SECRET` y `exp` en el pasado. Es lo
que el sistema recibiría a los 16 minutos, sin depender del reloj de la máquina.

**Esto no es falsear la prueba**: se ejerce el mismo camino y sólo se adelanta el reloj — el criterio
que este repositorio ya aplica en la fase 35 de QA con `SETTLEMENT_HOLDBACK_HOURS=0`.

## Lo que estos escenarios NO cubren, dicho aquí

- **Varias instancias del CLIENT**: la deduplicación es por proceso (D-2). Una prueba con dos procesos
  mediría la limitación declarada, no un defecto.
- **La rotación del refresh token**: fuera de alcance. Cuando se implemente, el escenario 8 cambia de
  significado — pasa de eficiencia a corrección.

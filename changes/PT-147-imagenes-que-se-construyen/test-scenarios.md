# PT-147 — Escenarios de prueba

## La guarda: los ficheros citados existen

| # | Escenario | Esperado |
|---|---|---|
| AC-01 | **RED** contra el `ci.yml` de hoy | **Falla** nombrando `./Dockerfile` |
| AC-02 | **GREEN** tras apuntar a los cuatro reales | Pasa |
| AC-03 | Control — `file:` a un fichero inexistente | **Falla** |
| AC-04 | Control — `file:` a uno real | Pasa |
| AC-05 | Control — `context:` a un directorio inexistente | **Falla** |
| AC-06 | Control — un paso sin `file:` | No revienta |

## Las cuatro imágenes

| # | Imagen | Contexto | Criterio |
|---|---|---|---|
| IMG-01 | `src/api/Dockerfile` | **raíz** | Construye. `@ironloot/core` resuelto |
| IMG-02 | `src/admin/Dockerfile` | `src/admin` | Construye |
| IMG-03 | `src/apps/base/Dockerfile` | `src/apps/base` | Construye |
| IMG-04 | `src/apps/client/Dockerfile` | `src/apps/client` | Construye |

> Los contextos **no son uniformes** a propósito. Escribirlos todos igual haría fallar el del API.

## Arrancar — la lección de H-017

| # | Escenario | Criterio |
|---|---|---|
| RUN-01 | ADMIN arrancado | Llega a `healthy` |
| RUN-02 | BASE arrancado | Llega a `healthy` |
| RUN-03 | CLIENT arrancado | Llega a `healthy` |
| RUN-04 | API con postgres y redis | Llega a `healthy`; `GET /api/v1/health` responde |
| RUN-05 | Si alguno no llega | **El log se vuelca antes de fallar.** Un job que muere sin decir por qué obliga a reproducirlo a mano |

> RUN-01..03 prueban además que `views/` y `public/` viajaron a la imagen: su healthcheck pide `/`, no
> un endpoint JSON.

## Regresión

| # | Suite | Línea base |
|---|---|---|
| REG-01 | Unitarias | **729** + la guarda nueva |
| REG-02 | Los ocho jobs | Ejecutados; en verde si el triaje no abre nada |

## Lo que NO se prueba aquí

- Vulnerabilidades de la imagen base → **TD-016**.
- `nginx`: probarlo de verdad exige tener detrás los cuatro.
- Publicar imágenes (`push: false`).

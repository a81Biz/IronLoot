# PT-147 — Design: el job `docker` construye lo que existe

**Tipo**: BUG · **Complejidad**: STANDARD · **Origen**: PT-143.7

## El defecto

```yaml
- name: Build Docker image
  with:
    context: .
    file: ./Dockerfile        # <- NO EXISTE en la raiz
    tags: ironloot-api:${{ github.sha }}
```

```
ERROR: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
```

Los `Dockerfile` de producción los creó **PT-129** y viven en `src/api/`, `src/admin/`,
`src/apps/base/` y `src/apps/client/`. En la raíz no hay ninguno, y no lo ha habido nunca.

**Ninguna imagen se ha construido nunca en CI.**

## Por qué estuvo oculto: dos capas

1. El job estaba condicionado a `refs/heads/prod || refs/heads/prep` — dos ramas inexistentes.
   Quedaba `skipped` siempre.
2. **Un job saltado no cuenta como fallo.** El workflow se declaraba `success` con `docker` sin
   ejecutar. Es un escalón peor que H-015: allí `build` y `docker` no corrían por colgar de un job
   que no terminaba, y **eso se veía**.

PT-143 corrigió la condición y dejó el job **corriendo y fallando**, a propósito, para que este PT
tuviera algo visible que arreglar.

## Decisiones

### D1 — Las cuatro imágenes, no una inventada

| Imagen | Contexto | Por qué |
|---|---|---|
| `src/api/Dockerfile` | **la raíz del monorepo** | `package.json` declara `"@ironloot/core": "file:../packages/core"`; con el contexto en `src/api` no se puede copiar. El propio fichero lo avisa en su cabecera |
| `src/admin/Dockerfile` | `src/admin` | Copia sólo lo suyo |
| `src/apps/base/Dockerfile` | `src/apps/base` | Ídem |
| `src/apps/client/Dockerfile` | `src/apps/client` | Ídem |

**Los contextos no son uniformes, y eso es correcto.** Escribirlos todos igual —el error natural— haría
fallar el del API o copiar de más en los otros tres.

### D2 — Construir **y arrancar**, que es la lección de H-017

H-017 fue un healthcheck que apuntaba a `/health` cuando la ruta real era `/api/v1/health`: la imagen
se construía perfectamente y el contenedor quedaba `unhealthy` para siempre. **Construir no es
arrancar**, y una imagen que sólo se ha construido no está probada.

Los cuatro `Dockerfile` declaran `HEALTHCHECK`. El job arranca cada imagen y espera a que el
contenedor llegue a `healthy`.

**Matiz que decide el alcance**: el API necesita base de datos y Redis para arrancar. Los tres SSR no
—sirven páginas; su healthcheck pide `/`—. Así que:

- **Los tres SSR**: se arrancan solos y se espera su `healthy`.
- **El API**: se arranca con `postgres` y `redis` como servicios del job, y con las variables mínimas.
  Es más caro, y es justo la imagen cuyo arranque destapó cinco bloqueos en PT-129.

### D3 — Si falla, se tría con la regla de PT-136

Es la primera vez que estas imágenes se construyen en CI. Puede salir cualquier cosa. Defecto del job
→ se corrige aquí; defecto del repositorio → PT propio.

### D4 — `nginx` queda fuera

`src/nginx/Dockerfile` existe, pero nginx no es un servicio de aplicación: es el proxy, y probarlo de
verdad exige tener detrás los cuatro. Se declara fuera con su motivo en vez de incluirlo a medias.

## Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | El build del API falla por `@ironloot/core` | Es el riesgo que PT-129 identificó como principal. El contexto correcto es la raíz, y está escrito en el propio `Dockerfile` |
| R2 | Arrancar cuatro contenedores alarga el job | Se mide. Si duele, se declara |
| R3 | El API no llega a `healthy` por configuración, no por la imagen | Se le dan las mismas variables que al job de integración. Si aun así falla, es un hallazgo real — el de F-135-A |
| R4 | La caché de buildx enmascara un fallo de instalación | Es la lección de PT-135. Al menos una construcción sin caché |

## Lo que este PT NO decide

- **No cambia ningún `Dockerfile`.** Los creó PT-129 y arrancaban; lo que falta es que CI lo compruebe.
- **No publica imágenes.** `push: false`.
- **No añade escáner de vulnerabilidades de la imagen base** — eso es **TD-016**.

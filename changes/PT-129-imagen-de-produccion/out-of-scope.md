# PT-129 — Fuera de alcance

---

## No entra

### El esquema de la base y el pipeline
**Son PT-127 (H-014) y PT-128 (H-015).** Este PT depende de los dos: de PT-127 para que la imagen
tenga esquema contra el que arrancar, y de PT-128 para que exista un pipeline donde verificarla.

### La documentación desactualizada
**Es PT-130 (H-016).** Sí entra actualizar `06-Backend-Architecture.md` en lo que **este PT vuelve
falso** (que sólo el API tiene imagen de producción).

### Un `docker-compose` de producción
Este PT deja **imágenes**, no una composición que las orqueste con sus variables, redes y volúmenes.
Decidir el modelo de despliegue —compose, Kubernetes, un PaaS— es una decisión de plataforma, no la
corrección de un defecto. **Se anota como pendiente.**

### Un job de despliegue
`ci.yml` no despliega y **este PT no lo añade**. Construir y arrancar para verificar no es
desplegar.

### Publicar imágenes en un registro
El job `docker` sigue con `push: false`. Elegir registro y política de etiquetado es otra
conversación.

### Optimizar el tamaño de las imágenes
Se **mide** y se anota (B3). No se persigue un objetivo de tamaño: no hay uno fijado y optimizar sin
criterio es ruido.

### Añadir un alias `/health` fuera del prefijo global
Sería «arreglar» el 404 adaptando la aplicación a su fichero equivocado. El prefijo es correcto; lo
que está mal es el `Dockerfile`. **No se toca `main.ts`.**

### Healthchecks para nginx, Postgres, Redis y Mailhog
`src/nginx/Dockerfile` no tiene healthcheck; los servicios de infraestructura usan los suyos por
imagen. Fuera de alcance: el hallazgo es sobre los cuatro servicios de aplicación.

### Reescribir los `Dockerfile.dev`
Los cuatro de desarrollo se quedan como están. Sólo se toca `docker-compose` para que **herede** el
healthcheck en vez de redefinirlo, y el comportamiento observable no cambia.

---

## Se registra pero no se resuelve

| Observación | Dónde va |
|---|---|
| `@ironloot/core` sin mecanismo de resolución en producción | **Sí se resuelve**: es PT-129.3, el riesgo real del PT |
| No existe `docker-compose` de producción | `HANDOFF.md`. Merece su propio PT |
| `src/nginx/Dockerfile` sin healthcheck | Se anota |
| PT-126 acotó el contexto de Docker y `@ironloot/core` queda fuera de él | Es la tensión que resuelve D4. Si la vía elegida obliga a ampliar el contexto, **se dice y se justifica**, no se amplía en silencio |

---

## Criterio de crecimiento

- **Impide que una imagen construya o llegue a `healthy`** → entra.
- **No lo impide** → se registra y no se arrastra.

En particular: si al construir los SSR aparecen dependencias de desarrollo mal declaradas o
importaciones que sólo funcionan por el volumen montado, **eso entra** — impide arrancar. Si aparece
código muerto o una mejora de empaquetado, **no entra**.

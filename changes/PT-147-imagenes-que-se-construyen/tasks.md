# PT-147 — Tareas atómicas

**Prerequisito**: PT-143 fusionado (el job ya se ejecuta y falla).
**Regla**: si algo sale rojo, se tría con la de PT-136 — defecto del job aquí, defecto del
repositorio a su PT.

---

## PT-147.1 — RED: la guarda de que el `Dockerfile` citado existe

- **Objetivo**: el defecto no era el contexto: era **citar un fichero que no está**. Eso se puede
  comprobar sin construir nada.
- **Salida**: `dockerfiles-citados-existen.spec.ts` — todo `file:` de un workflow apunta a un fichero
  real, y todo `context:` a un directorio real.
- **Validación**: **falla hoy** nombrando `./Dockerfile`.
- **Status**: PENDING

## PT-147.2 — GREEN: las cuatro imágenes, con su contexto

- **Entrada**: D1. Los contextos **no son uniformes**: el API construye desde la raíz porque
  `@ironloot/core` es `file:../packages/core`; los tres SSR desde su carpeta.
- **Salida**: cuatro pasos de build en el job.
- **Validación**: PT-147.1 en verde y las cuatro construyen.
- **Status**: PENDING

## PT-147.3 — Los tres SSR arrancan y llegan a `healthy`

- **Objetivo**: D2. Construir no es arrancar (H-017).
- **Salida**: cada imagen arrancada; espera activa a `healthy`, con volcado de logs si no llega.
- **Validación**: los tres. Su healthcheck pide `/`, así que además demuestra que `views/` y
  `public/` viajaron a la imagen.
- **Status**: PENDING

## PT-147.4 — El API arranca contra postgres y redis

- **Objetivo**: la imagen cuyo arranque destapó cinco bloqueos en PT-129.
- **Entrada**: servicios `postgres` y `redis` en el job, y las variables mínimas — las mismas que el
  job de integración.
- **Salida**: contenedor en `healthy`; `GET /api/v1/health` respondiendo.
- **Validación**: si no llega, **volcar el log antes de fallar**. Un job que muere sin decir por qué
  obliga a reproducirlo a mano.
- **Status**: PENDING

## PT-147.5 — Al menos una construcción sin caché

- **Objetivo**: R4, y es la lección de PT-135: el volumen anónimo de `node_modules` tapó un lock roto
  durante un día.
- **Salida**: la del API sin `cache-from`, o un paso periódico que lo haga.
- **Validación**: se declara cuál se construye en frío y por qué esa.
- **Status**: PENDING

## PT-147.6 — Triaje de lo que salga

- **Salida**: tabla `imagen | fallo | clase | destino`.
- **Validación**: ninguna fila sin clase. **Es la primera vez que estas imágenes se construyen en CI.**
- **Status**: PENDING

## PT-147.7 — Casos de control de la guarda

- **Salida**: (a) `file:` a un fichero inexistente → **falla**; (b) a uno real → pasa;
  (c) `context:` a un directorio inexistente → **falla**; (d) un paso sin `file:` no revienta.
- **Status**: PENDING

## PT-147.8 — Regresión, evidencia, registro

- **Salida**: los **ocho jobs en verde** si el triaje no abre nada · `evidence/PT-147/` en `.md` ·
  `HISTORY.log` + `HANDOFF.md` · **TD-016** anotada como lo que sigue faltando (escáner de la imagen
  base).
- **Validación**: STATE 5. BUG → `VALIDATION_PENDING`.
- **Status**: PENDING

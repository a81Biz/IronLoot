# PT-129 — Escenarios de prueba

**Criterio rector**: construir no es arrancar. El healthcheck roto de hoy pasaría cualquier
verificación de sólo-build. **Todo escenario de aceptación exige un contenedor en marcha.**

---

## Happy path

### E1 — Las cuatro imágenes construyen

```
docker build -f src/api/Dockerfile          -t ironloot-api:ptsa   <contexto>
docker build -f src/admin/Dockerfile        -t ironloot-admin:ptsa <contexto>
docker build -f src/apps/base/Dockerfile    -t ironloot-base:ptsa  <contexto>
docker build -f src/apps/client/Dockerfile  -t ironloot-client:ptsa <contexto>
```

**Aceptación**: las cuatro construyen.
**Hoy**: sólo existe la del API.

### E2 — Las cuatro arrancan y llegan a `healthy`

```
docker run -d … && sleep 40 && docker ps --format "{{.Names}}\t{{.Status}}"
```

**Aceptación**: las cuatro en `Up … (healthy)`.
**Hoy**: la del API quedaría `unhealthy` **permanente** — su healthcheck pide una ruta con 404.

### E3 — Los SSR sirven una página real

```
curl -o /dev/null -w "%{http_code}"  http://localhost:3001/          # ADMIN
curl -o /dev/null -w "%{http_code}"  http://localhost:5174/          # BASE
curl -o /dev/null -w "%{http_code}"  http://localhost:5175/          # CLIENT
```

**Aceptación**: **200**, con HTML renderizado.
**Por qué este escenario existe**: `npm run build` compila TypeScript y **no copia `views/` ni
`public/`**. Una imagen que sólo lleve `dist/` arranca, pasa el healthcheck y devuelve 500 en la
primera página. **El healthcheck no lo detecta.**

### E4 — El healthcheck del API responde donde dice

```
docker exec <api> node -e "require('http').get('http://localhost:3000/api/v1/health', r=>console.log(r.statusCode))"
```

**Aceptación**: **200**.

### E5 — `@ironloot/core` resuelve

```
docker logs <api> | grep -i "cannot find module"
```

**Aceptación**: **sin coincidencias**. El contenedor arranca sin errores de módulo.
**Riesgo real**: en desarrollo el paquete se enlaza a mano en el entrypoint; en producción no hay
equivalente.

---

## Casos de control — **obligatorios**

### C1 — La prueba detecta una ruta de healthcheck equivocada

Cambiar `/api/v1/health` por `/health` en un `Dockerfile`.

**Aceptación**: `healthcheck-apunta-a-ruta-real.spec.ts` **falla**. Revertir → pasa.

### C2 — Un healthcheck roto impide llegar a `healthy`

Construir y arrancar con la ruta rota.

**Aceptación**: el contenedor **nunca** llega a `healthy`; se queda en `starting` y pasa a
`unhealthy`. Es la comprobación de que el mecanismo funciona de verdad — y la demostración de qué
habría pasado en producción.

### C3 — Una imagen sin `views/` falla al servir

Construir un SSR omitiendo la copia de `views/`.

**Aceptación**: el healthcheck **pasa** y la página devuelve **500**.
Este control existe para dejar constancia de por qué E3 es obligatorio: hay un modo de fallo que el
healthcheck no ve.

---

## Casos borde

### B1 — Degradación parcial: `/health` responde 503

Simular una dependencia caída (parar Redis) y observar el healthcheck.

**Aceptación**: con `< 500`, el contenedor **sigue `healthy`** y la degradación se reporta por
`/health/detailed`. Con el criterio anterior (`=== 200`) se volvería `unhealthy` y el orquestador lo
reiniciaría sin motivo. **Es la justificación medida del cambio de umbral.**

### B2 — El API arranca antes que la base

**Aceptación**: `start-period` de 5 s más 3 reintentos dan margen. Si no basta, se ajusta el
`start-period` — no el umbral.

### B3 — Tamaño de imagen y tiempo de build

**Aceptación**: se miden y se anotan. No hay umbral fijado; lo que no se mide, se descontrola.

### B4 — `docker-compose` tras heredar el healthcheck

**Aceptación**: `docker-compose up -d` → los cuatro `healthy`, **exactamente como hoy**. Es la
regresión más importante del PT: el entorno de trabajo diario no puede degradarse.

---

## Casos de error

### F1 — El build falla por `@ironloot/core`

**Aceptación**: mensaje claro en el build. **No** una imagen que construye y falla al arrancar.

### F2 — El job `docker` apunta a un fichero inexistente

**Aceptación**: falla en el paso de construcción, no en silencio.
**Hoy**: es exactamente el estado de `ci.yml:205` (`./Dockerfile`), y no se ve porque el job nunca
se ejecuta.

---

## Regresión

| Comprobación | Estado esperado |
|---|---|
| `docker-compose up -d` | los cuatro servicios `healthy` |
| BASE / CLIENT / ADMIN en desarrollo | sirven sus páginas como hoy |
| `npm run typecheck` | limpio |
| `npx jest` (API / CORE) | 603 / 134 verdes |
| Checkpoints de auditoría | los cuatro verdes |
| Tiempo del pipeline | medido y anotado |

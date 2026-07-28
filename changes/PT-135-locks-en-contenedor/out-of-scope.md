# PT-135 — Fuera de alcance

Cada exclusión con su razón. **Ninguna de estas queda como deuda**: o no lo es, o ya estaba registrada
antes de este PT y sigue su propio camino.

---

## No se toca el producto

`src/api/src/` y el resto del código de aplicación: **ni un fichero**. Este defecto es de cadena de
suministro y empaquetado. Si al reconstruir aparece un defecto de producto, se registra como hallazgo
—no se maquilla— y se decide aparte.

## No se toca el esquema

`prisma/schema.prisma` ni las migraciones. **La migración se aplica correctamente hoy**, y el log lo
declara. Se dice explícitamente porque es lo primero que uno mira al ver este arranque roto —el
recuerdo de H-014 tira hacia ahí— y es el camino equivocado. RULE-10 no aplica.

## No se toca el volumen anónimo de `node_modules`

`docker-compose.yml:117` se queda como está. Pasarlo a volumen nombrado —o quitarlo— **no corrige
nada**: sólo cambiaría el control de *cuándo* se recrea la caché que **tapaba** el defecto. Y toca el
entorno de todos los días.

**No es deuda**: es una decisión de diseño vigente, con su efecto ahora medido y documentado en
`DISCOVERY.md` § PT-135.

## No se toca el healthcheck

Ni el de `docker-compose` ni el de `Dockerfile`. PT-129 los corrigió y la ruta es `/api/v1/health`,
la buena. **El healthcheck funciona**: da `unhealthy` porque no hay nadie escuchando, que es
exactamente lo que debe hacer.

## No se reescribe la historia

`5c16af4` —el commit sucio que metió el lock del API junto a cambios de páginas y `Dockerfile.dev`—
se queda. `HISTORY.log` es append-only y la historia de git no se reescribe (regla FDGE). **No es
deuda: es un hecho.** Se cita en el ADR como el ejemplo de por qué existe la regla de commits
atómicos.

## No se afinan los tamaños de imagen

La imagen del API pesa 541 MB porque no se poda (`Dockerfile:76-95`, decisión de PT-129 con coste
medido). Sigue **declarado fuera de alcance allí**, y este PT no lo reabre. Una imagen grande que
arranca vale más que una pequeña que no.

## No se amplía la guarda de rutas SSR↔API a ADMIN y BASE

Está en `HANDOFF.md` como acción recomendada y **es deuda ya registrada antes de este PT**, con su
propio camino. Mezclarla aquí engordaría un MAJOR que ya creció bastante.

## No se resuelven los dos defectos de ADMIN que destapó el grafo

El `<script>` dentro de `{% block title %}` en `reconciliation.html` y el modal `data-bs-*` sin
Bootstrap en `refunds.html`. Registrados en `PTSA/PENDIENTES.md` § S-002-G, filas 9 y 10, **antes de
este PT**. Son de plantillas; no tienen relación con locks.

## No se resuelve H-005

Quién emite la factura. Es decisión de negocio y fiscal; ningún PT puede resolverlo.

## No se añade escáner de vulnerabilidades de imagen base (TD-016)

Deuda ya registrada, con la forma decidida (contra línea base, no contra umbral — lección de PT-118).
Camino propio.

## Lo que sí entra aunque parezca lateral

Se dice para que no haya duda al leer el paquete:

- **`src/admin`** entra: su lock no viajaba y eso **es** la mitad de la alternativa C.
- **Los tres SSR** entran, sólo en sus `Dockerfile.dev`, por `npm ci` y el `COPY` del lock.
- **`ci.yml`** entra completo: siete jobs.
- **`.gitignore`** entra: es donde vive la contradicción.

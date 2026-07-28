# HANDOFF — estado actual

**Fecha**: 2026-07-28
**Rama activa**: `fix/PT-135-locks-en-contenedor` — **sin fusionar**, 10 commits, árbol limpio.
`master` sigue en 7f091c3.

**Pruebas**: **944/944** unitarias (API 691 · CORE 134 · CLIENT 103 · ADMIN 13 · BASE 3) ·
**77/77 e2e** · `lint` 0 errores · `npm audit --omit=dev` **0** en los cinco ·
`audit:check` **OK** contra la línea base.

**Plataforma**: NestJS **11.1.28** · Express **5.2.1** en los cuatro servicios.

**PTSA**: Clase **A** · Health **95.5** · un solo hallazgo activo: **H-005**.
*(Los scores no se recalculan aquí: PT-135 no cerró ningún hallazgo PTSA.)*

---

## Lo último: el contenedor que no arrancaba, y el lock que llevaba un día roto en silencio

**PT-135 — `VALIDATION_PENDING`. Es un BUG: lo cierra el humano.**

El API arrancaba, aplicaba migraciones, compilaba con 0 errores **y moría** al cargar el árbol de
módulos: faltaba `@css-inline/css-inline-linux-x64-gnu`. Con el API `unhealthy`, nginx, admin, base y
client **no arrancaron nunca** — los cuatro dependen de su `service_healthy`. **Un defecto, cinco
contenedores caídos.**

**La causa**: PT-126 regeneró `src/api/package-lock.json` **en Windows** y el lock cayó de **17
paquetes de plataforma a 2**. Era la **tercera** vez que este repositorio se encuentra el mismo
defecto; las dos anteriores se cerraron con un parche en un Dockerfile.

| Pieza | Mecanismo que deja |
|---|---|
| El lock regenerado **en el contenedor** | `npm run lock:api` — encapsula las tres cosas que hubo que medir |
| **G1** `lock-declara-plataformas.spec.ts` | El lock debe declarar `linux-x64-gnu` y `linux-x64-musl` |
| **G2** `scripts/solo-en-contenedor.js` | `preinstall` que **impide** instalar fuera del contenedor. **Sin puerta de escape** |
| Alternativa **C** resuelta | `.gitignore:40` retirado · los tres locks seguidos · `src/admin` por primera vez · **ADR-048** |
| **`npm ci`** | Imágenes de api y admin, los siete jobs, y el `postinstall` de la raíz |
| **RULE-15** · **TD-017** cerrada | La segunda escritura, hecha |

**G1 caza el síntoma en CI. G2 impide producirlo** — y es la única pieza que actúa sobre la cuarta vez.

---

## Lo que falta para cerrar PT-135

1. **Ver los siete jobs en verde en un push real** (criterio 10). No es verificable sin empujar.
   Ensayado en contenedor: `npm ci` en la raíz, exit 0, con el `postinstall` instalando api y admin.
2. **El VoBo humano** sobre lo demás.

---

## Dos hallazgos nuevos, ajenos a PT-135 y sin PT asignado

Están en `DISCOVERY.md` § Revisión U-002 con su medición. **No son deuda diferida**: son defectos
preexistentes que aparecieron al recorrer el camino entero.

### F-135-A — `REDIS_URL` parece la palanca y no lo es

Dos de los tres clientes de Redis (`app.module.ts:61`, `throttler-redis.module.ts:31`) leen
**`REDIS_HOST`/`REDIS_PORT`** con reserva `localhost`; sólo `distributed-lock.service.ts` lee
`REDIS_URL`. Y `docker-compose.yml` declara **sólo `REDIS_URL`**: lo que hace funcionar el contenedor
de desarrollo es `REDIS_HOST=redis` dentro de `src/api/.env`, **un fichero que no está en git**.

Al arrancar la imagen de producción con lo que el compose sugiere, la aplicación arranca bien y el
healthcheck la marca `unhealthy` con un mensaje sobre `maxRetriesPerRequest` **que no menciona Redis**.
Familia de PT-111/F-39. Necesita decisión: unificar en `REDIS_URL`, o declarar
`REDIS_HOST`/`REDIS_PORT` como el contrato y llevarlos al compose y al `.env.example`.

### F-135-B — ocho guardas no pueden correr dentro del contenedor de desarrollo

Leen el árbol del monorepo y `docker-compose` **no lo monta**, así que `RAIZ` resuelve a `/`. La de
PT-129 falla ahí con `ENOENT` y **0 pruebas ejecutadas**. Pasan en CI y en el host. Choca con la
invariante de PT-135: si npm se ejecuta en el contenedor, esta familia no puede correr ahí.

Menor, de la misma familia: **`security-baseline.json` no viaja al contenedor**, así que `audit:check`
ejecutado dentro falla con «No hay línea base» aunque el fichero exista y esté en git.

---

## Riesgos y deuda abiertos

| | Qué |
|---|---|
| **H-005** | Quién emite la factura. Mantiene D1 en 85 y bloquea P-012. **Ningún PT puede resolverlo**: es decisión de negocio y fiscal |
| **TD-016** | **Nada comprueba las vulnerabilidades de la imagen base.** `audit:check` mira npm; los avisos de `node:20-slim`/`alpine` no los recoge ningún control |
| | La guarda del contrato SSR↔API cubre **sólo el CLIENT**; faltan ADMIN y BASE |
| | La suite QA corre sobre **HTTP**: lo que dependa de origen seguro no queda ejercido |
| | `ironloot_db` es base de desarrollo **y** dato que sostiene validaciones PTSA — y `run-all.sh` la trunca |
| | ADMIN sin `favicon.ico` |
| | **«Conciliación» de ADMIN sin JavaScript**: `reconciliation.html:2` mete el `<script>` en `{% block title %}`, que el layout no declara. El botón «Conciliar» está muerto |
| | **El modal «+ Crear reembolso» de ADMIN no abre**: usa `data-bs-*` y no hay Bootstrap en ADMIN |

---

## Lo que hay que saber antes de tocar nada

1. **`npm` no se ejecuta en el host.** Se ejecuta en el contenedor, y el lock se regenera con
   `npm run lock:api`. Lo **impide** `preinstall`; lo vigila `lock-declara-plataformas.spec.ts`.
   → **RULE-15**, ADR-048
2. **`docker compose down -v` borra la base de datos.** Los volúmenes nombrados
   (`ironloot_postgres_data`) caen con ella. Para recrear sólo el `node_modules` de un servicio:
   `docker compose rm -fsv api`. El plan de PT-135 decía `down -v` y era un error.
3. **El volumen anónimo de `node_modules` tapa los defectos de instalación.** Cualquier verificación
   de arranque tiene que declarar con qué volumen se hizo, o no prueba nada.
4. **Editar `schema.prisma` exige generar migración.** → RULE-10
5. **`src/api/scripts/` no está montado como volumen**: cambiar el entrypoint exige
   `docker-compose build api`.
6. **Antes de tocar un endpoint, buscar sus llamantes en todo `src/`**, incluido el JS de navegador.
   → RULE-13
7. **Toda guarda se prueba en los dos sentidos.** → RULE-14
8. **`run-all.sh` trunca la base de datos.** Copia antes (`pg_dump`) si contiene salida real.
9. **Añadir una línea a un `package.json` desplaza las citas del TRD**, y la guarda documental lo caza.
   Es una molestia con una razón: una cita precisa se lee con confianza, y por eso una cita falsa es
   peor que ninguna (H-016).
10. **Consultar `docs-v2/` ANTES de diagnosticar.** En PT-135 el log invitaba a mirar la migración
    —el recuerdo de H-014 tira hacia ahí— y la migración estaba bien.

---

## Próximas acciones recomendadas

1. **Empujar `fix/PT-135-locks-en-contenedor` y ver los siete jobs con `npm ci`.** Es lo único que
   falta del criterio 10, y la primera vez que el lock gobierna de verdad en CI.
2. **Decidir F-135-A**: es un defecto de despliegue con un síntoma que engaña, y hoy sólo funciona por
   un fichero que no está en git.
3. **Decidir H-005.** Sigue siendo lo único que separa al sistema de cero hallazgos abiertos.
4. **F-135-B**: montar la raíz en el servicio `api` o dar un comando que envuelva el contenedor
   desechable. Hoy la invariante y la forma de correr las pruebas no encajan.
5. **TD-016** — escáner de imagen, **contra línea base y no contra umbral** (lección de PT-118).
6. **Los dos defectos de ADMIN** de `PENDIENTES.md` § S-002-G, filas 9 y 10, con la guarda que los
   caza de raíz: **todo `{% block %}` de una plantilla tiene que existir en su layout**.

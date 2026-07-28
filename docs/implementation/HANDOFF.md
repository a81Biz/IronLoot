# HANDOFF — estado actual

**Fecha**: 2026-07-27
**Rama**: `master` — `71cc10a`, cero ramas sin fusionar.

**Pruebas**: **856/856** unitarias (API 603 · CORE 134 · CLIENT 103 · ADMIN 13 · BASE 3) ·
`lint` 0 errores · **`npm audit --omit=dev` = 0 en los cinco proyectos**.

**Plataforma**: NestJS **11.1.28** · Express **5.2.1** · path-to-regexp **8.4.2** en los cuatro
servicios (API, BASE, CLIENT, ADMIN).

---

## Lo último: TD-015 cerrada, y lo que aparecio al cerrarla

`TD-015` llevaba abierta desde PT-110 con 63 avisos. **Cero**, en los cinco proyectos.

| PT | Qué era | Estado |
|---|---|---|
| **PT-124** | **H-013** — la subida dejaba al cliente elegir la extensión de guardado | VALIDATION_PENDING |
| **PT-125** | `bcrypt` 5→6 (saca `tar`, el único CRÍTICO) y fuera la dependencia `uuid` | VALIDATION_PENDING |
| **PT-126** | NestJS 10→11 + Express 4→5 en los cuatro servicios | VALIDATION_PENDING |

### H-013 vale más que los 12 avisos juntos

`upload.service.ts` guardaba con `extname(file.originalname)` y el controlador validaba
`file.mimetype`. **Los dos son campos del `multipart` que escribe quien sube.** Un fichero declarado
`image/png` y llamado `x.html` se guardaba como `<uuid>.html`, y `ServeStaticModule` lo devolvía
como `text/html` desde el origen del API — al que llegan las cookies porque `COOKIE_DOMAIN` empieza
por punto.

**`nosniff` estaba puesto, funcionaba, y no aplicaba**: sólo impide *adivinar* un tipo distinto del
declarado, y aquí el declarado ya era `text/html`. Es la clase de mitigación que un checklist marca
como presente.

Ningún `npm audit` iba a señalarlo. Apareció midiendo la alcanzabilidad del aviso de `multer`,
que era **el vecino** del problema.

### Lo que la migración destapó, y ninguno era del framework

- **`JWT_SECRET` se leía en 6 sitios sin exigir que existiera.** `validate-startup-config` lo pedía
  sólo en producción. Los tipos de NestJS 11 lo señalaron; la salida fácil era un `!`, que calla al
  compilador y deja el sistema igual de roto.
- **`ms('pronto')` devuelve `undefined` en silencio**, y ese silencio llegaba hasta el `sign`.
- **El adaptador de Handlebars se importaba entrando en `dist/`** del paquete.
- **F-42 — ningún servicio tenía `.dockerignore`.** `tsconfig.tsbuildinfo` viajaba a la imagen de
  ADMIN y `tsc` concluía que ya había emitido todo. **Mismo síntoma que F-36 y TD-013, ya
  «arreglado» dos veces en otro sitio.**
- **`lint:check` apuntaba a `apps/` y `libs/`**, que no existen.

### Y un error propio, que es el que más conviene recordar

Para cerrar los últimos avisos puse **overrides globales** de `minimatch` y `brace-expansion`.
Cerraron los avisos y **le rompieron los globs a ESLint**. `npm audit` daba 0 y `lint:check`
respondía *«No files matching the pattern»*: **dejó de lintar y no falló.** Otra vez la forma de
F-34, y se vio porque se ejecutó el lint después, no porque el override avisara.

> **Un override global sube ese paquete para TODO el árbol, herramientas incluidas.** Si el aviso
> vive en una rama, el override va acotado; y si hace falta global, se declara la excepción:
> `"brace-expansion": ">=5.0.8"` + `"eslint": { "brace-expansion": "^1.1.11" }`.

---

## Antes de eso: los tres checkpoints que faltaban, y el análisis de TD-015

`audit-scope.yaml` declaraba desde el 23-jun cuatro checkpoints de CI. Sólo existía uno.

| PT | Qué era | Estado |
|---|---|---|
| **PT-120** | **D1.N1** — las reglas de dominio de F-1 se habían escrito **tres veces** (DS-004, DS-006, DS-008) en guiones temporales que se perdían | VALIDATION_PENDING. 14 reglas como código (`scripts/domain-rules.ts`) |
| **PT-121** | **D3** — cinco fallos silenciosos en una sola sesión y ninguno lo encontró un test | VALIDATION_PENDING. Detector de `catch` mudos, **25 en línea base** |
| **PT-122** | **D5** — estaba clasificada como checkpoint de CI, y no puede serlo | VALIDATION_PENDING. Reclasificada a métrica de delta sync, con el motivo escrito |
| **PT-123** | **TD-015** — 12 paquetes con aviso, severidad heredada sin medir | CLOSED (investigación) |

**Lo que apareció al hacerlo:**

- **PT-120 — `SIN_DATOS` no es `CUMPLE`.** Una regla que no se pudo mirar queda **fuera del
  denominador**. Contarla como cumplida inflaría el `rubric`; como violada lo hundiría. Ninguna de
  las dos sería cierta, y la cómoda es la peligrosa.
- **PT-121 — un comentario no cuenta como rastro.** El `catch` de F-34 decía *«live feed is
  optional»* y tuvo la puja en vivo apagada varios días con la suite entera en verde. El detector
  **quita los comentarios antes de decidir**. Y barre los 8 ámbitos, **incluido el JS del
  navegador**: ahí es donde vivía F-34.
- **PT-122 — el Retry Rate al 75% ROJO era mi propio error de métrica.** El denominador incluía
  ciclos abiertos que la vía garantizada estaba sondeando; un ciclo esperando a que alguien pague no
  «necesitó un reintento». Corregido a ciclos **resueltos**: 0%. La lectura mala habría puesto
  `health_unstable = true` y capado la clase a **B** por una definición, no por un sistema inestable.
- **PT-123 — de los 12 avisos, cero quedan sin mitigación.** Ver abajo.

## Pendiente de validación humana

**Tres PT**: `PT-124`, `PT-125`, `PT-126`. Los nueve anteriores (PT-114…PT-122) están **CLOSED**
con tu VoBo del 27-jul; PT-123 es investigación y cerró sola.

**Un hallazgo PTSA**: `H-013` (CORREGIDA). **No lo cierro yo**: es un BUG y la regla es explícita.
`H-008`…`H-012` quedan **CERRADAS**. La única `ABIERTA` es `H-005`, y no depende de código.

## Estado PTSA (DS-008)

**Health 90.5 · Clase B · Confidence 62.8** — D1 85 · D2 85 · D3 100 · D4 95.

> **Por qué no es A.** §15.6: *un Health A con Confidence < 90 no obtiene clasificación A*. Lo que
> hunde la Confidence es la cobertura, no la calidad. **11 de 12 productos en VALIDADO** con VoBo
> humano; el que falta depende del PAC.

## Bloqueado por dependencia externa

`H-005` / `TD-001` — **CFDI: la decisión pendiente no es técnica**. PT-113 demostró que el bloqueo
no es contratar un PAC, sino **quién emite la factura** (la plataforma o el vendedor). Es tuya.

`TD-002` (Stripe/HeyBanco: sin credenciales) · `F-27` (dispersión a tarjeta: el SDK de Mercado Pago
no expone *payout*) · `TD-009` (riesgo aceptado; lo que protege es la deduplicación, y está).

## Pendiente de implementar

**Nada.** Ninguna deuda técnica queda abierta salvo la bloqueada por terceros.

---

## Riesgos vivos

1. **`security-baseline.json` está vacío a propósito, y eso hay que saber leerlo.** Vacío no es
   «no se ha mirado»: es «se miró y no quedaba nada». La diferencia la marca el campo `generado`
   (**no** `revisado` — escribir la fecha en una clave que el script no lee dejaba «Línea base de
   undefined» sin que nada fallara). Si aparece un aviso nuevo, el checkpoint D2 falla.
2. **La guarda de coherencia documental no corre en CI**: `docs/` está gitignored y el test se salta
   si los ficheros no están. Protege a quien tiene los documentos.
3. **`docs/enterprise-documentation/` es un recorrido del 23-jun con parches encima**, no una
   regeneración. Han entrado ~33 PT desde entonces. Foundation Protocol dice que una nueva ejecución
   sobrescribe todo. Regenerar es decisión tuya.
4. **El ROADMAP de FPGE está agotado**: emisión del 23-jun, sus ítems o hechos o bloqueados.
5. **CLIENT arranca distinto a los otros dos** (`nest build && nest start --watch`). No está roto
   —esa compilación previa es justo lo que lo salva de F-36— pero son tres formas de arrancar tres
   cosas iguales.

## Antes de producción

1. **`ADMIN_TOTP_SECRET`** — sin él la API **no arranca** en producción. Es intencionado (PT-093).
2. **`REDIS_URL` para ADMIN** — desde PT-111 la sesión del panel vive en Redis. Si no conecta, el
   arranque falla **diciendo la causa**; antes moría con `RedisStore is not a constructor`.
3. **`PUBLIC_SCHEME=https` y `PUBLIC_DOMAIN=ironloot.com`** — de ahí se derivan todas las URLs.
4. **El webhook de PayPal** (`79912641J8336873F`) apunta a una URL de marcador.
5. **`Payment.reference` es única.** Una BD con datos previos puede tener duplicados y el índice no
   se crea hasta deduplicar. SQL en `Modelo-de-Datos.md`, migración 25.
6. **Los vendedores existentes** deberán verificar su cuenta antes del próximo retiro (PT-092).

---

## Los checkpoints, y cómo se corren

```bash
cd src/api
npm run audit:check        # D2 — dependencias contra security-baseline.json   (en CI)
npm run audit:domain       # D1.N1 — 14 reglas de F-1 contra la BD             (en CI)
npm run audit:silence      # D3 — catch mudos contra la línea base             (en CI)
npm run audit:reliability  # D5 — delta sync, NO CI: en CI la base nace vacía
```

**Ninguno cuenta.** Los cuatro comparan contra una **línea base declarada** y fallan ante lo nuevo.
Un umbral numérico se pone en rojo permanente el primer mes y alguien lo desactiva; una línea base
dice qué se miró y cuándo.

**Y ninguno da verde sin datos.** `SIN_DATOS` es su propio estado en los cuatro. Un checkpoint que
dice «todo bien» sobre una base vacía es peor que no tenerlo.

## Cómo cambiar de entorno

Dos variables del `.env` raíz:

```
PUBLIC_SCHEME=http            # produccion: https
PUBLIC_DOMAIN=ironloot.local  # produccion: ironloot.com
```

`docker-compose` deriva `BASE_URL`, `CLIENT_URL` y `COOKIE_DOMAIN`. Los adaptadores no construyen
URLs: llaman a `depositReturnUrl()`, con una ruta canónica para todas las pasarelas.

> ⚠️ **No poner `localhost` en `PUBLIC_DOMAIN`.** Los navegadores rechazan `Domain=.localhost` y la
> sesión deja de cruzar de BASE a CLIENT. Con `localhost:<puerto>` no se nota —el puerto no delimita
> cookies— y por eso el fallo aparece justo al pasar a subdominios.

> ⚠️ **`docker-compose.override.yml` está vacío a propósito.** Volvía a fijar `localhost:<puerto>` y
> vaciaba `COOKIE_DOMAIN`. Si el 80 vuelve a estar ocupado: `NGINX_HTTP_PORT=8081` y
> `PUBLIC_DOMAIN=ironloot.local:8081`, conservando los subdominios.

## Trampas del entorno (verificadas)

- **`docker restart` NO relee `env_file`.** Hay que `docker-compose up -d --force-recreate api`.
- **En Orders v2 de PayPal, aprobar no mueve el dinero**: `APPROVED` está autorizado pero sin
  cobrar. Por eso el sondeo **captura**, no sólo consulta. Es la diferencia con Mercado Pago que más
  fácil sería pasar por alto.
- **La cuenta *business* de sandbox no puede aprobar**: PayPal devuelve `CANNOT_PAY_SELF`. Hace
  falta una **personal**.
- **`connect-redis` v9 no tiene `default`**: es `const { RedisStore } = require('connect-redis')`.
  Y quiere un cliente de `redis`, **no de `ioredis`**, con `await client.connect()` explícito.
- **El `.gitignore` versiona decisiones y excluye artefactos** (PT-112). `docs/`, `changes/`,
  `PTSA/` y `CLAUDE.md` **sí** van al repositorio; `qa-out/`, `graphify-out/` y las capturas de
  evidencia no. Antes era al revés y el repositorio no contaba nada de cómo se decidió.
- Hay un **`*.js` global** pensado para la salida de TypeScript, con excepción para `public/js/`.
  Conviene comprobar que un script de front nuevo llega de verdad al repositorio.
- El checkout de **Mercado Pago no se puede automatizar** sin credenciales de un comprador de
  prueba: se crea el cobro con la Orders API, que es el mismo pago real.
- El registro por API exige **verificar el correo**; el gate es `state`, no `email_verified_at`:
  tocar la fecha a mano no sirve, hay que llamar a `/auth/verify-email`.
- **La ventana de disputa cuenta desde `shipments.delivered_at`** — `orders` no tiene esa columna
  (H-011). Un guion que la asuma en `orders` falla en silencio.
- BD en **localhost:5433**, no 5432.
- El entrypoint hace `prisma db push --accept-data-loss` en cada arranque: no hay
  `_prisma_migrations` en desarrollo (ADR-006 / AUD-001). Generar el SQL con `migrate diff`,
  comprobar que es aditivo y aplicarlo con `psql`. `ALTER TYPE … ADD VALUE` **no corre dentro de una
  transacción**.
- Los `Decimal` de Prisma **no son serializables a JSONB**.
- `UnauthorizedException` del proyecto (`common/observability`) **no es** la de `@nestjs/common`: un
  test que importe la de Nest falla con «Expected UnauthorizedException, received
  UnauthorizedException».
- **Un `override` de npm con `$paquete`** apunta a la versión de la dependencia directa. Es la salida
  cuando una copia anidada trae el aviso y la de arriba ya está parcheada (PT-119).
- Commits con heredoc, no here-strings de PowerShell. Y un heredoc de shell con comillas o barras
  invertidas dentro se atraganta —se comió un `replace(/\\/g, …)` y lo dejó en `replace(/\/g, …)`—:
  **para documentos largos, escribir el fichero con la herramienta, no por heredoc.**
- **Comprobar un código de salida a través de una tubería devuelve el de la tubería.**
  `npm run audit:check | tail; echo $?` dio 0 con el checkpoint fallando.
- **`docker-compose up -d --build` NO actualiza `node_modules`**: es un volumen anónimo
  (`- /app/node_modules`) que sobrevive a la reconstrucción. Hace falta
  `--force-recreate --renew-anon-volumes`. Un `npm install` nuevo puede quedar invisible durante
  horas si no se comprueba la versión **dentro** del contenedor.
- **`COPY . .` no lee `.gitignore`** (F-42). Los cuatro servicios ya tienen `.dockerignore` y hay
  una guarda que lo exige.
- **Un `override` de npm sin acotar sube el paquete para TODO el árbol**, herramientas incluidas.
  Rompió los globs de ESLint sin que ninguna comprobación fallara. Si el aviso vive en una rama,
  acotarlo; si hace falta global, declarar la excepción de quien no debe moverse.
- **`bash run-all.sh` trunca 32 tablas de la BD.** Es destructivo por diseño; no lanzarlo sobre
  datos que importen.

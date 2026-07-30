# 10 — Technical Debt

**Source:** Code inspection, git history references, `.env.example`, schema comments  
**Last updated:** 2026-06-23

## CONFIRMED STUBS / INCOMPLETE IMPLEMENTATIONS

### TD-001 — CFDI/PAC Integration (stub)
**Status:** ✅ **CERRADA 2026-07-29 por decisión de negocio — aceptada como limitación declarada de v1.0.**  
**Evidence:** `src/api/prisma/schema.prisma:739-754` — `CfdiRecord` model fully defined; `src/api/src/modules/cfdi/` exists; no PAC HTTP client found in dependencies. **Nada de eso cambió**: sigue siendo un stub.  
**Qué cambió, y es lo único:** el humano decidió el 2026-07-29 *«acepta como limitación declarada»*, y la
**declaración de valor se enmendó a la vez** (`PTSA/Fases/F-1_Declaracion_Valor.md § U-006`): la plataforma
ya **no promete** emitir CFDI en v1.0, y `P-012 (CfdiRecord)` pasó a `FUERA_DE_ALCANCE_V1`. El hallazgo
gemelo **H-005** se cerró con el mismo acto.
**Por qué esto no es cerrar una deuda declarándola cerrada.** Una deuda que se cierra «aceptándola» sin
tocar la promesa deja el registro mintiendo igual: seguiría existiendo un hueco entre lo que el producto
dice hacer y lo que hace. Aquí **la promesa es lo que se retiró**. Emitir un CFDI exige un **PAC certificado
ante el SAT** —un tercero contratado— y una decisión fiscal sobre quién factura una venta entre
particulares. **No hay código que sustituya a eso.**
**Reapertura declarada:** si v1.1 vuelve a declarar la facturación como producto entregado, `P-012` vuelve
al inventario y **esta deuda y H-005 se reabren con él**.
**Los tres modelos posibles**, con sus consecuencias técnicas medidas, están en
`docs/implementation/evidence/PT-155/hallazgos.md`. La opción C es subconjunto de la B; la B exige datos
fiscales y una autorización legal que **no se pueden pedir retroactivamente** a quien ya vendió.

### TD-002 — Stripe y Hey Banco: el código está; faltan las credenciales
**Status:** **REESCRITA 2026-07-29 por PT-181 — el enunciado anterior era falso.** Sigue abierta, pero por
otro motivo del que decía.  
**Lo que decía:** *«In `PaymentProvider` enum but no integration code confirmed»*.  
**Lo que hay, medido:** `src/api/src/modules/payments/providers/stripe.provider.ts` (**128 líneas**) y
`heybanco.provider.ts` (**169 líneas**), **ambos registrados como adaptadores** en
`payments.module.ts:38-39`. Y como PT-087 exige las garantías a **todo adaptador registrado**,
`provider-guarantees.spec` las comprueba para los cuatro — **6 pruebas en verde**.
**Lo que falta de verdad:** **credenciales de ambas pasarelas**. Sin ellas el código no se puede ejercer
contra el proveedor real, que es la única prueba que cuenta para un cobro. Es un tercero, igual que el PAC
de TD-001, y por eso sigue abierta.
**Por qué importa la diferencia.** «No hay código» y «hay código sin credenciales» llevan a decisiones
opuestas: la primera dice *implementar*, la segunda dice *conseguir accesos y probar*. Un registro que
manda a escribir lo que ya está escrito cuesta el trabajo entero. Es la familia de ND-002 y ND-007, las dos
corregidas hoy: **una afirmación de ausencia envejece de la peor manera.**
**Impact:** Mercado Pago y PayPal están operativos y probados contra el proveedor real; Stripe y Hey Banco,
sin verificar.

> **Corrected 2026-07-25 (PT-076).** This entry previously read *"Only Mercado Pago and
> PayPal are operational"*, which was false: PayPal had integration code (WPS + IPN) but
> was **never configured or tested** — `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` were
> empty in every `.env`, and any deposit attempt threw `PAYPAL_BUSINESS_EMAIL not
> configured`. PT-076 migrated PayPal to Orders v2 + Webhooks; it is implemented and unit
> tested, but **remains unverified against PayPal sandbox** pending credentials.

### TD-006 — Mercado Pago webhook deliveries are not idempotent
**Status:** ✅ **CLOSED 2026-07-26 by PT-080.**

> ⚠️ **PT-078 declaró cerrada esta deuda y no lo estaba.** Su protección deduplicaba por el id
> de *orden*, y un mismo pago de Mercado Pago existe además como id de pago numérico: notificado
> por las dos rutas, se acreditaba dos veces. PT-080 lo cerró de verdad, con identificador
> canónico por proveedor, y lo verificó contra la pasarela real. Se deja constancia porque el
> patrón —declarar cerrado con hallazgos abiertos en la misma superficie— es la razón por la que
> el desarrollador exigió que los hallazgos se resuelvan dentro de su propio ciclo.

**Cierre anterior (PT-078, incompleto):** Deduplication now keys on the provider's
**payment id** (`processed_webhook_events`, unique `(provider, payment_id)`) and applies to all
four providers. The investigation also showed the original PT-076 key (notification id) was
insufficient: Mercado Pago emits several distinct notifications about the same payment
(`payment.created`, `payment.updated`), so only the payment id prevents crediting twice.
ADR-025 superseded by ADR-027. Kept below for the record.

~~**Status:** Open. Introduced as known debt by PT-076.~~  
**Evidence:** `src/api/src/modules/payments/payments.service.ts` — `creditOnce()` only
deduplicates providers that report an `eventId`; Mercado Pago does not, so a redelivered
webhook credits the wallet again.  
**Impact:** Duplicate deposit crediting is possible on gateway retries.  
**Risk:** HIGH — involves money.  
**Note:** The `processed_webhook_events` mechanism built in PT-076 is provider-agnostic and
ready to be reused. It was scoped out of PT-076 to avoid touching a flow already validated
with real money (PT-063..065). See `changes/PT-076-paypal-orders-v2/out-of-scope.md` nº 2.

### TD-007 — `enableSeller()` KYC gate has no test coverage
**Status:** CERRADA 2026-07-27 por PT-090 — verificado, ya lo estaba desde PT-079.
**Evidence del cierre:** `test/unit/users/users.service.spec.ts:313, 325, 335` ejercitan el
camino de rechazo (`enableSeller` lanza con KYC no aprobado). El doble de `KycService` se
reinicia entre tests (`:89-93`) precisamente para que un rechazo forzado no contamine a los
siguientes.
**Nota:** la deuda siguio figurando como abierta durante un dia despues de estar cubierta. Es el
motivo de PT-090: un registro que miente hace que se priorice mal.

### TD-003 — Un retiro se paga a una CLABE que nadie ha verificado
**Status:** ✅ **CERRADA 2026-07-27 por PT-092.** Reescrita antes por PT-090 (su descripcion
era falsa). Se comprueba leyendo `src/api/src/modules/wallet/account-verification.service.ts`
y `withdrawals.service.ts:50`, que rechaza el retiro con «Esta cuenta aun no esta verificada».
**Correccion de la descripcion:** decia que la verificacion estaba «mockeada» y la validacion
«comentada», lo que sugiere que basta con descomentarla. **No es asi**: la comprobacion de
existencia SI esta activa —`withdrawals.service.ts:36-37` llama a `getUserPaymentMethod()` y
rechaza con 400 si no existe—. El defecto real es otro, y peor.
**Evidence:** `payments.service.ts:75` crea el metodo de pago con `isVerified: false`, y **nadie
en todo el repositorio lo pone nunca a `true`** (`grep -rn "isVerified: true" src/` no devuelve
nada). Nadie lo comprueba tampoco: `getUserPaymentMethod()` filtra por `isActive`, no por
`isVerified`.
**Impact:** Se puede retirar dinero a una CLABE que nadie ha confirmado que pertenezca al usuario.
El digito verificador de la CLABE se valida (`isValidClabe`), lo que atrapa erratas de tecleo pero
**no la titularidad**: una CLABE ajena valida pasa igual.
**Next:** **PT-092** en la matriz de deuda tecnica.
**Evidence:** `src/api/src/modules/wallet/wallet.controller.ts:121-123` — comment "Mock for now, should verify if user has this method registered".  
**Impact:** Withdrawals may process without verifying the user has a valid payment method registered.  
**Risk:** MEDIUM — potential operational issue.

### TD-004 — El panel de administracion entra sin segundo factor
**Status:** ✅ **CERRADA 2026-07-27 por PT-093.** El arranque en produccion se aborta sin
`ADMIN_TOTP_SECRET` (>=16 caracteres), con la misma validacion pura que ya protegia `JWT_SECRET`
y las credenciales admin. En desarrollo sigue siendo opcional: obligarlo alli llevaria a
desactivarlo de formas peores.
**Historico de la descripcion — reescrita por PT-090**: no era que estuviera indocumentado.
**Correccion de la descripcion:** `ADMIN_TOTP_SECRET` **si** esta documentado, en
`.env.example:135`. El problema es que es **opcional**: `app.controller.ts:26` calcula
`requiresTotp = !!process.env.ADMIN_TOTP_SECRET`, de modo que si la variable esta vacia —como
viene por defecto— el panel entra con usuario y contrasena y nada mas.
**Impact:** El backoffice es el contexto de mas privilegio del sistema: aprueba retiros, suspende
usuarios, cancela subastas. Protegerlo solo con contrasena en produccion es desproporcionado.
**Next:** **PT-093** en la matriz de deuda tecnica.
**Evidence:** `src/admin/src/app.controller.ts:28` — `const requiresTotp = !!process.env.ADMIN_TOTP_SECRET`.  
**Risk:** Admin accounts can be accessed with only username+password if `ADMIN_TOTP_SECRET` is not set.

### TD-005 — `unsafe-inline` in Content Security Policy
**Status:** ✅ **CERRADA DEL TODO 2026-07-27.** `script-src` por PT-096 y `style-src` por
PT-105 (que cerro TD-014). La CSP de los tres sitios ya no lleva `'unsafe-inline'` en ninguna
directiva. Se comprueba en
`src/apps/{base,client}/src/main.ts` y `src/admin/src/main.ts`: ni `scriptSrc` ni `styleSrc`
llevan ya `'unsafe-inline'`.

> **PT-141 —** Este bloque se contradecia a si mismo: abria con *«CERRADA DEL TODO … en ninguna
> directiva»* y tres lineas despues afirmaba *«Queda `styleSrc`, que sigue llevandolo»*. La segunda
> frase era **prosa de antes de PT-105** que sobrevivio a la actualizacion del estado. Un lector que
> se quedara en ella creeria abierta una deuda cerrada, y —peor— creeria que aun se puede escribir un
> `style=` inline. Es la forma exacta de F-33: el estado se actualizo y la explicacion no.  
**Evidence:** ninguno de los tres `main.ts` lleva ya `'unsafe-inline'`; las dos guardas
(`plantillas-sin-js-inline.spec.ts` y `estilos-fuera-de-plantillas.spec.ts`) lo vigilan, cada una
con casos de control que demuestran que saben fallar.  
**Riesgo residual:** ninguno de esta deuda. Lo que queda es que un `style=` o un manejador inline
nuevo **no funcionaria y el navegador no diria nada** — el silencio que hizo invisible a F-34. Por
eso hay guardas y no solo convencion (RULE-07, RULE-09).

## NOT DETERMINED

### ND-002 — Rate limiter storage backend
**Status:** ✅ **CERRADA 2026-07-29 por PT-171 — ya lo estaba desde PT-030, y este registro lo negaba.**  
**Evidence:** `src/api/src/app.module.ts:90` — `storage: new ThrottlerStorageRedisService(redis.client)`,
con el cliente provisto por `ThrottlerRedisModule` (PT-128: creado suelto, Nest no lo conocía y
`app.close()` no lo cerraba).  
**Lo que decía, y por qué importa que fuera falso:** *«no `ThrottlerStorageRedisService` referenced»*,
citando `app.module.ts:75-85`. Estaba ahí **desde PT-030**, que es el PT que cerró **H-002** — el mismo
defecto, en el registro de hallazgos. Así que **dos registros oficiales decían cosas opuestas sobre el
mismo hecho**, y el que mentía era el que gobierna la deuda.
**Una afirmación de ausencia envejece de la peor manera:** el día que alguien añade lo que se declaraba
ausente, la frase sigue ahí y ya es falsa, sin que nada cambie de color. Es H-016 aplicado a la deuda.
**Vigilada por:** `deuda-no-determinada-vigente.spec.ts` (**RULE-35**), que comprueba las dos
direcciones: que el hecho siga siendo cierto y que el documento lo declare cerrado.

### ND-003 — Email template locations
**Status:** ✅ **CERRADA 2026-07-29 por PT-171 — estaban donde esta misma entrada mandaba mirar.**  
**Evidence:** `src/api/src/modules/notifications/templates/verification.hbs` y
`reset-password.hbs`.  
**Lo que decía:** *«email templates not found in reconnaissance»*, con «**Location to check:**
`src/api/src/modules/notifications/templates/`». Los dos ficheros están exactamente ahí. Un pendiente
que se resuelve mirando donde él mismo dice es la familia de los dos que cerró PT-141 («ya estaban, en
`F-1 § 5`»): **el coste no es el trabajo, es que nadie vuelve a mirar.**
**Vigilada por:** `deuda-no-determinada-vigente.spec.ts` (**RULE-35**).

### ND-004 — Test coverage percentage
**Status:** ✅ **CERRADA 2026-07-29 por PT-181 — confirmado: NO hay umbral configurado.**  
**Evidence:** `src/api/jest.config.js` (donde vive la configuración desde PT-172) **no declara
`coverageThreshold`**. `collectCoverageFrom` sí está; el umbral que haría fallar la suite por bajar de un
mínimo, no.
**La incógnita se resolvió, y lo que queda es una decisión, no un desconocimiento.** Poner un umbral es
elegir un número y aceptar que la suite falle por debajo — trabajo con dueño, no un «no determinado». Se
separan a propósito: mezclarlos es lo que mantuvo abiertos seis `ND` durante semanas, cinco de los cuales
se cerraban **mirando**.
**Dato para cuando se decida:** la suite del API son **933 pruebas en 114 suites**; el monorepo, 1186.

### ND-007 — CLIENT proxy pattern
**Status:** ✅ **CERRADA 2026-07-29 por PT-181 — la afirmación era FALSA.**  
**Evidence:** `src/apps/client/src/main.ts:13` importa `createProxyMiddleware`, y `:83` monta el proxy BFF
sobre `/api` inyectando la cabecera `Authorization` desde la cookie. **Lo puso PT-038 (AUD-003).**
**Lo que decía:** *«CLIENT does not use the BFF proxy (no `http-proxy-middleware`)»*. Con el `import`
delante. Es la familia de **ND-002** —que afirmaba que `ThrottlerStorageRedisService` no estaba referenciado
cuando llevaba ahí desde PT-030— y de **H-016**: una afirmación de ausencia envejece de la peor manera,
porque el día que alguien añade lo que se declaraba ausente la frase sigue escrita y ya es falsa.
**Cómo se descubrió:** al escribir la fase 35 (PT-175) hubo que decidir si las llamadas del navegador
podían ser relativas. Lo eran, **porque el proxy existe** — y este `ND` decía lo contrario.
**Vigilada por:** `deuda-no-determinada-vigente.spec.ts` (**RULE-35**), con el hecho declarado.

### ND-006 — BullMQ queue names and processors
**Status:** ✅ **CERRADA 2026-07-29 por PT-181 — inventariadas.**  
**Evidence:** dos colas, y sólo dos: `NOTIFICATION_QUEUE`
(`src/api/src/modules/notifications/notifications.module.ts:16`) y `WEBHOOK_RETRY_QUEUE`
(`src/api/src/modules/payments/payments.module.ts:22`). Ambas por `BullModule.registerQueue()`.
**Nota:** el `ND` pedía «inventariar», y eso se cierra mirando. Costaba un `grep`.

### ND-001 — WebSocket event payload schemas
**Status:** ✅ **CERRADA 2026-07-29 por PT-181 — el gateway público está localizado.**  
**Evidence:** `src/api/src/modules/auctions/auctions.gateway.ts`. Los eventos que `CLAUDE.md` nombra
—`bid.new`, `auction.extended`— viven ahí, y sus cargas están ahora **acotadas por prueba**:
`src/api/test/unit/seguridad/emisiones-publicas-sin-datos-privados.spec.ts` falla si una emisión nueva
lleva un campo identificativo.
**Lo que este cierre NO afirma:** que los esquemas de payload estén *documentados*. No lo están, y eso es
una tarea de documentación con dueño (`docs-v2/`, que mantienen personas — ADR-049), no un «no
determinado». **La incógnita se resolvió: el gateway existe y sus cargas están medidas.** Lo que quede es
trabajo, no desconocimiento, y mezclarlos es lo que mantuvo este `ND` abierto seis semanas.

> **Revisión 2026-07-30 (PT-191, AUD-006).** Esta entrada decía *«los gateways son dos»* y citaba
> `events.gateway.ts`, que **ya no existe**: era un segundo namespace público, sin autenticar, con el
> mismo nombrado de salas, un emisor genérico y **cero llamantes**. Se retiró al cerrar AUD-006.
> Se **reescribe la frase, no el símbolo** (RULE-38): cambiar sólo la cita habría dejado un cierre que
> afirma un hecho falso con aval de evidencia. Lo delató la guarda de RULE-35, que comprueba que toda
> ruta citada por un `ND` existe — es decir, **el registro se acusó a sí mismo**, que es para lo que
> están esas guardas.

### ND-005 — Feature flags implementation
**Status:** ✅ **CERRADA 2026-07-29 por PT-181 — inspeccionada, y lo que hay merece decirse.**  
**Evidence:** `src/api/src/modules/feature-flags/feature-flags.service.ts` son **ocho líneas**:
`isEnabled(flag)` devuelve `process.env[flag] === 'true'`. No hay controlador, no hay persistencia, no hay
caché. **Y `grep -rn "FeatureFlagsService"` fuera de su propia carpeta no devuelve nada: cero llamantes.**
**Candidato a retirada, con una decisión de por medio.** ADR-047 dice que *un endpoint sin llamantes se
retira, no se pule*, y esto es el mismo caso. **No se retira aquí** por dos razones: está citado en
`docs-v2/5-qa/Master-Test-Plan.md`, que mantienen personas (ADR-049), y en el inventario. Retirar un módulo
documentado es una decisión de producto, no una corrección de coherencia. Queda registrado para que se
decida sabiendo lo que es: **un lector de variables de entorno de ocho líneas que nadie llama.**

## KNOWN TECHNICAL DECISIONS WITH TRADEOFFS

### TT-001 — Soft-close implemented as scheduler logic, not DB status
The `SOFT_CLOSE` state is not in `AuctionStatus` enum. Auctions remain `ACTIVE` during soft-close. The scheduler decides extension based on `endsAt` timestamp. This simplifies the state machine but means querying "which auctions are in soft-close" requires a time-range query, not a status filter.

### TT-002 — Ledger is insert-only
Financial history is immutable. Corrections must be made via `ADJUSTMENT` ledger entries. This is correct by design but means no DELETE on `ledger` table should ever be written.

### TT-003 — Admin is a separate NestJS app, not an admin module in the API
Trade-off: complete isolation (admin UI compromise doesn't affect API auth); cost: separate deployment, two sets of templates, duplication of some service logic.

### TT-004 — SSR with Nunjucks instead of SPA
Trade-off: simpler deployment, no build step, SEO-friendly; cost: less interactive UI without extra JS, `unsafe-inline` in CSP.

## DEPENDENCY NOTES

- `stripe: ^20.1.2` is installed in `src/api/package.json:80` but Stripe integration is not confirmed.
  <!-- PT-172: la cita decia `:68`, que es `ioredis`. Estaba mal ANTES de este PT —`stripe` no se ha
       movido— y ninguna guarda la cubria: `coherencia-documentacion-codigo.spec.ts` vigila la tabla de
       stack del TRD y su prosa, no este documento. Es H-016 en el registro de deuda. -->
- `mercadopago: ^2.11.0` — primary payment provider.
- `otplib: ^12.0.1` — TOTP for 2FA.
- `bullmq: ^5.79.0` — async job queue (PT-038).
- `nanoid: ^3.3.7` — short ID generation (usage location not verified).

## LEGACY / CLEANUP NOTES

- Legacy `web/` SSR frontend was removed 2026-06-19 per git history. References to `web/` in comments are historical.
- `docker-compose.yml:4` — comment "web/ legacy retirado" confirms removal.
- Test file `src/api/test/unit/web-views/web-views.deprecation.spec.ts` may be a remnant.


### TD-008 — El modelo de dominio es order-céntrico y los depósitos de wallet no encajan
**Status:** ✅ **CLOSED 2026-07-26 por PT-085.**

> ⚠️ **El impacto estaba subestimado en esta ficha.** Se describió como *«no bloquea, pero cada
> funcionalidad nueva de dinero tropieza con lo mismo»*. Al abrir PT-085 se descubrió que
> **el panel financiero del admin consulta `payments` en seis sitios** (`admin.service.ts:45,
> 143, 149, 253, 257, 261`) y, como nadie escribía nunca esa tabla, **mostraba ceros**. No era
> deuda de modelado: era un defecto visible de producto.
>
> **Resuelto**: `Payment.orderId` y `RefundRequest.orderId` pasan a opcionales; el ciclo de pago
> escribe su fila de `Payment` al cerrarse, y un cobro duplicado genera la `RefundRequest` que
> PT-080 quería crear y no pudo. Verificado con un depósito real: la tabla, vacía desde siempre,
> registró 199.99 MXN con `order_id = NULL`, y los ingresos del día dejaron de ser cero.

**Ficha original:**
**Evidence:** `Payment.orderId` y `RefundRequest.orderId` son obligatorios con clave foránea a
`Order`. Un depósito de wallet no tiene orden, de modo que:
- `payments` **nunca se escribe** (0 filas tras depósitos reales acreditados);
- no se puede crear un `RefundRequest` para devolver un cobro duplicado de depósito.
**Impact:** PT-080 tuvo que crear una tabla propia (`payment_cycles`) y usar esa misma tabla como
cola de revisión, en lugar de reutilizar los modelos existentes. Es el tercer sitio donde aparece
el mismo defecto de modelado.
**Risk:** MEDIO — no bloquea, pero cada funcionalidad nueva de dinero fuera de subastas tropieza
con lo mismo.

### TD-012 — Tres de los cuatro servicios no se lintean, y lo aparentan
**Status:** ✅ **CERRADA 2026-07-27 por PT-091.** Se comprueba con `npm run lint:check` en la
raiz: encadena los **cinco** proyectos (`src/api`, `src/admin`, `src/apps/base`,
`src/apps/client`, `src/packages/core`), y los cinco terminan con 0 errores.
**Evidence:** Solo `src/api` tiene configuracion de ESLint. ADMIN, BASE y CLIENT declaran un
script `lint` en su `package.json` que **falla al ejecutarse**: `"eslint" no se reconoce como un
comando`. Ni la herramienta instalada ni fichero de configuracion. El de la API, ademas, solo
cubre `*.ts` bajo `src/`: el JavaScript de navegador queda fuera en los cuatro (ver TD-010).
**Impact:** Un script `lint` que existe y falla es peor que no tenerlo: da por cubierto lo que no
lo esta. Tres proyectos con codigo TypeScript y plantillas nunca han pasado por un linter.
**Next:** PT propio. Instalar ESLint + configuracion en los tres, ejecutar SIN `--fix` primero
para medir el dano, y corregir por lotes. Un `--fix` a ciegas sobre ficheros nunca linteados tiene
superficie de regresion real.


### TD-013 — Reiniciar el contenedor de ADMIN lo deja caido
**Status:** ✅ **CERRADA 2026-07-27 por PT-094.** `nest-cli.dev.json` con `deleteOutDir: false`
para el contenedor de desarrollo; el de produccion conserva `true`, que es lo correcto para un
build. Verificado: `docker restart ironloot-admin` -> HTTP 200, healthy.
**Historico:**
**Evidence:** `nest-cli.json` tiene `deleteOutDir: true`. Nest borra `dist/` en cada arranque y,
con los montajes de Windows, `node dist/main` se dispara antes de que la compilacion aterrice:
node muere, se lleva el watcher y el contenedor queda `unhealthy` con
`Cannot find module '/app/dist/main'`. Reproducido con `docker restart ironloot-admin`.
**Impact:** `docker restart` **no** es una operacion segura para ADMIN. Hay que recrear
(`docker-compose up -d --force-recreate admin`). Misma familia que la trampa del `env_file`.
**Next:** no se cambia `deleteOutDir`: borrar la salida es correcto para los builds de produccion.
Mitigacion posible: separar la configuracion de desarrollo, o un arranque que espere a que
`dist/main.js` exista.


### TD-010 — El JavaScript del navegador vive inline en las plantillas
**Status:** ✅ **CERRADA 2026-07-27 por PT-096.** Se comprueba con
`src/apps/client/test/plantillas-sin-js-inline.spec.ts` (12 casos, barre las plantillas de los
tres sitios). PT-102 anadio despues `orden-de-scripts.spec.ts`, porque sacar el JS movio una
dependencia de orden y apago la puja en vivo (F-34).
**Evidence:** El `.gitignore` tenia un `*.js` global —pensado para la salida de TypeScript— que se
llevaba por delante **todo** el JavaScript de navegador: cero ficheros de front versionados en el
repositorio. Al anadir la excepcion (`!src/apps/*/public/js/**/*.js`) entraron dos scripts de
ADMIN (`src/admin/public/js/`) que llevaban sin versionar desde siempre y **nadie habia notado**.
**Impact:** El resto del JS sigue inline en las plantillas Nunjucks. Funciona porque la CSP de los
sitios SSR permite `'unsafe-inline'` (ver TD-005), pero significa que no se puede cachear, ni
enlazar, ni pasar por lint, ni probar. Los dos scripts de ADMIN incorporados **no se han
revisado**.
**Next:** revisar los dos scripts de ADMIN; extraer el JS inline a ficheros conforme se toquen las
paginas. Va de la mano de TD-005.


### TD-011 — Los flujos autenticados dependen del fichero hosts
**Status:** ✅ **MITIGADA 2026-07-27 por PT-095.** El dominio sigue haciendo falta —no hay
alternativa tecnica: los navegadores rechazan `Domain=.localhost`— pero ya no falla en silencio:
al arrancar se comprueba que `base.*` y `client.*` resuelven y, si no, se avisa con las lineas
exactas que hay que pegar en el fichero hosts. **No aborta**: es un problema del entorno de quien
desarrolla, no del codigo.
**Historico:**
**Evidence:** El dominio de desarrollo es `ironloot.local` porque los navegadores **rechazan** una
cookie con `Domain=.localhost` (dominio de uso especial, RFC 6265) y la sesion no cruzaria de BASE
a CLIENT. Verificado en navegador: cero cookies almacenadas con `.localhost`.
**Impact:** Un checkout limpio **no arranca los flujos autenticados** hasta anadir cinco lineas al
fichero hosts del sistema. Esta documentado en README, `.env.example` y CLAUDE.md, pero es un paso
manual y silencioso: quien lo omita vera un login que "funciona" y un portal que lo trata como
anonimo.
**Next:** no hay alternativa tecnica con `localhost`. Mitigacion posible: una comprobacion al
arrancar que avise si el dominio configurado no resuelve.


### TD-009 — Un 4xx en firma inválida no garantiza que la pasarela deje de reintentar
**Status:** Open, riesgo aceptado por PT-080.
**Evidence:** La documentación de Mercado Pago solo indica que espera 200 o 201; no documenta el
comportamiento ante 4xx.
**Impact:** El 401 se adoptó por corrección semántica y observabilidad —un rechazo legítimo dejaba
de contarse como error interno—, no porque garantice el cese de los reintentos.


### AUD-012 / ADR-008 — Capa de use-cases de CORE
**Status:** ✅ **RESUELTA 2026-07-26 por PT-084 — con una decisión, no con una implementación.**

Se investigó y se decidió **no adoptarla**. Los cuatro use-cases estaban documentados pero su
fuente no existe en el repositorio (solo quedaba un `dist/` ignorado por git, residuo de un
checkout anterior), y los contratos de repositorio de CORE no los referencia nadie.

El flujo que gobernarían —orden a `PAID` y crédito `CREDIT_SALE` al vendedor— **ya funciona** en
`wallet.service.ts:418` y `auction-scheduler.service.ts:152`. Adoptarlos habría reescrito una
ruta de dinero que funciona, exigido cuatro adaptadores de repositorio que nadie pidió y añadido
riesgo de regresión en la liquidación de subastas.

Los contratos se conservan marcados como *previstos y no adoptados*, con el criterio para
revisar la decisión escrito en su propio código. Ver **ADR-033**.

---

### TD-014 — `style-src 'unsafe-inline'` sigue en la CSP de los tres sitios
**Status:** ✅ **CERRADA 2026-07-27 por PT-105.** Se comprueba con
`src/apps/client/test/estilos-fuera-de-plantillas.spec.ts` (14 casos, con dos de control) y
leyendo `styleSrc` en los tres `main.ts`: ninguno lleva ya `'unsafe-inline'`.

**Qué es.** PT-096 retiró `'unsafe-inline'` de `scriptSrc` —que era su objetivo y el riesgo
grande—, pero `styleSrc` lo conserva en los tres sitios: `src/apps/base/src/main.ts:66`,
`src/apps/client/src/main.ts:45`, `src/admin/src/main.ts:35`.

**Por qué se registra aparte en vez de dejar TD-005 «abierta».** Porque son dos cosas de tamaño
muy distinto y mezclarlas fue lo que hizo que TD-005 llevara meses diciendo «trade-off conocido»
sin que nadie supiera de qué parte hablaba. El JavaScript inline permite ejecutar código; el
estilo inline permite, como mucho, alterar la apariencia. Registrarlas juntas hacía que la parte
grave se escondiera detrás de la leve.

**Qué costaría.** Los estilos inline están repartidos por las plantillas como atributos `style=`.
Sacarlos es el mismo trabajo que hizo PT-096 con el JavaScript, con menos urgencia: es apariencia,
no ejecución.

**Riesgo mientras tanto.** Bajo. Un atacante que pueda inyectar marcado podría alterar el aspecto
de una página, pero `script-src` ya le impide ejecutar nada.

---

### TD-015 — 26 avisos (12 paquetes) que exigen salto de version mayor
**Status: CERRADA — 2026-07-27 (PT-125 + PT-126).** **Cero avisos** en los cinco proyectos.
Se comprueba con `cd src/api && npm audit --omit=dev` (y lo mismo en `src/apps/base`,
`src/apps/client`, `src/admin`, `src/packages/core`), o con `npm run audit:check`, cuya linea base
esta ahora **vacia a proposito**.

**Como se cerro, en dos pasos deliberadamente separados** —para que si algo se rompia se supiera
cual de los dos fue—:

- **PT-125** (12 -> 10 paquetes, 1 critico -> 0): `bcrypt` 5->6 saco `tar` del arbol. Y `uuid`
  resulto **no ser nuestra dependencia**: el rango vulnerable era `<11.1.1` y el unico nodo
  afectado, la copia anidada de `mercadopago`. Se quito la dependencia directa a favor de
  `crypto.randomUUID()` y la anidada se fijo por override a la **minima parcheada**.
- **PT-126** (10 -> **0**): los cuatro servicios NestJS a la 11 con **Express 5**
  (`path-to-regexp` 3->8, `body-parser` 1->2). El resto de la cadena del mailer, por override a sus
  versiones parcheadas.

El analisis que ordeno los tres pasos —y descarto el orden inverso— sigue siendo valido y esta en
`docs/implementation/ANALISIS-TD-015.md` (PT-123).

**Lo que dejo escrito, y vale mas que el cierre**: la severidad de un aviso es del paquete en
abstracto, no de este sistema. Medirla paquete a paquete (cadena con `npm ls`, punto de uso en el
codigo) dijo que **ninguno de los 12 era alcanzable sin autenticar**, y eso convirtio una urgencia
aparente en un trabajo planificable. Tambien destapo, de lado, un defecto **mas grave que los 12**
que ningun `npm audit` iba a señalar: **H-013 / PT-124**.

---

<details>
<summary>Historia de la deuda mientras estuvo abierta (PT-110 → PT-123)</summary>

**Status original:** Open. Registrada por PT-110 (PTSA H-008) y **reducida por PT-116**: la cadena
del mailer —11 paquetes, dos de los tres criticos— se subio entera. De 63 avisos a **27**, y de 3
criticos a **1**.

**Correccion de PT-119**: la entrada afirmaba que los 13 exigian salto mayor. Al volver a medirlo
—despues de que PT-116 cambiara el arbol— resulto que **`nodemailer` no**: la aplicacion ya estaba
en la 9.0.3 y el aviso venia de una **segunda copia en 8.0.5** anidada bajo `mailparser` ←
`preview-email` ← el mailer. Un `override` a `$nodemailer` unifica el arbol en una sola copia.
Quedan **12**.

Heredar el marco de un PT anterior sin volver a medirlo es como se acumulan las afirmaciones
falsas; es lo mismo que F-33 en otro sitio.

**Desde PT-118 esta acotada, no solo registrada.** `src/api/security-baseline.json` lista los 12
paquetes con su severidad, y el checkpoint D2 del CI **falla si aparece el numero 13**. Se comprueba
con `npm run audit:check`.

**Analizada a fondo el 27-jul-2026.** `docs/implementation/ANALISIS-TD-015.md` mide **alcanzabilidad
paquete a paquete** —cadena de dependencias con `npm ls` y punto de uso localizado en el codigo— en
vez de heredar la severidad del aviso. Resultado: de los 12, **6 no llegan a produccion** (instalacion,
o Swagger apagado por `main.ts:92`), **3 estan en el arbol sin uso alcanzable** (`uuid` v3/v5/v6 no se
invocan; el parser ASF de `file-type` no se alcanza) y **3 estan en el camino con mitigacion**
(`multer` tras `JwtAuthGuard`, `@nestjs/core`, `body-parser`). Los 12 se reducen a **tres decisiones
de plataforma**: NestJS 10→11 (cierra 7, arrastra Express 4→5), `bcrypt` 5→6 (1) y `uuid` 13→14 (1).
La recomendacion —y la decision es del negocio, no mia— es **no migrar Express ahora** y hacer los dos
saltos baratos por separado. Leerlo antes de tocar nada.

**Que es.** Tras PT-110 quedaban **63 avisos** en dependencias de produccion; PT-116 y PT-119 los
dejaron en **26 avisos / 12 paquetes**. Ninguno es alcanzable sin autenticar —eso lo cerro PT-110—
pero siguen ahi.

**Por que no se arreglaron.** Cada uno exige un salto de version **mayor** sobre un servidor que
mueve dinero real. Medido paquete a paquete:

| Paquete | Instalado | Parcheado | Salto |
|---|---|---|---|
| `body-parser` | 1.20.3 | 2.3.0 | mayor — Express 4 usa la 1.x |
| `path-to-regexp` | 3.3.0 | 8.4.2 | mayor — cambia el enrutado |
| `tar` | 6.2.1 | 7.5.22 | mayor |
| `glob` · `minimatch` · `brace-expansion` · `js-yaml` | | | mayor |

**Y la cadena del mailer va aparte.** `handlebars`, `liquidjs`, `mjml`, `html-minifier`,
`mailparser`, `nodemailer`, `linkify-it`, `js-cookie`, `file-type`, `multer` y `uuid` cuelgan de
`@nestjs-modules/mailer`. Subirlo exige `nodemailer >= 8` (hoy 7.0.13) y `npm audit fix` falla con
`ERESOLVE` justo ahi. Es **una sola unidad de actualizacion** y merece su propio trabajo, con su
propia verificacion: el correo de verificacion de cuenta pasa por ahi.

**Riesgo mientras tanto.** De los 3 criticos: `tar` solo corre al instalar; `liquidjs` esta cargado
y sin usar; `handlebars` si esta en el camino, pero su aviso exige controlar la plantilla y las
plantillas son del proyecto. **No se ha demostrado explotabilidad de ninguno** — afirmarla sin
demostrarla seria opinion.

**Como se comprobaba entonces.** `cd src/api && npm audit --omit=dev`.

</details>

---

### TD-016 — Nada comprueba las vulnerabilidades de la imagen base
**Status:** ✅ **CERRADA 2026-07-29 por PT-150.** El job `docker` de CI escanea la imagen del API con
Trivy (`CRITICAL`/`HIGH` con corrección publicada) y compara contra `src/api/base-image-baseline.json`
mediante `src/api/scripts/base-image-audit.js`. Se hace en ese job porque **ya tiene las imágenes
construidas** desde PT-147, y **después** de arrancarlas, para que un fallo del escáner no se confunda
con un fallo de arranque. El inventario se guarda como artefacto 30 días.
**Evidence:** verificado en las tres direcciones (`docs/implementation/evidence/PT-150/medicion.md`):
vulnerabilidad nueva → exit 1 · la misma triada → exit 0 · **sin fichero de línea base → aborta**
nombrándolo, en vez de aprobar por defecto.
**Línea base:** nace **vacía a propósito** — se declara el mecanismo antes de conocer lo que mide. Cada
entrada exige `id`, `fecha` y `motivo`: llenarla sin justificar cada línea es cómo este control dejaría
de valer.
**Riesgo residual:** el aviso del IDE (2 críticas y 23 altas en `node:20-alpine`) **no está triado
todavía** — la primera corrida en CI producirá el inventario real y ése es el trabajo siguiente. Este
PT construye el instrumento; corregir lo que mida es trabajo posterior con su propia evidencia.


`npm run audit:check` (PT-118) vigila las dependencias **de npm** y hoy da cero avisos. **No mira la
imagen base.** El IDE reporta que `node:20-alpine` arrastra **2 críticas y 23 altas**, y ese aviso
no lo recoge ningún control del repositorio.

Afecta a las cinco imágenes: `src/api/Dockerfile`, los tres `Dockerfile` de producción que creó
PT-129 y los `.dev`.

**Por qué aparece ahora.** Los `Dockerfile` no estaban en `auditable_patterns` de PTSA hasta S-002;
se añadieron al descubrir H-017. Un área recién entrada en el alcance destapa lo que nadie miraba —
es el mismo patrón que dejó H-008 con 34 días de retraso.

**Qué haría falta.** Un escáner de imagen (Trivy, Grype, `docker scout`) en el pipeline, comparando
contra una línea base como hace `audit:check` — **no contra un umbral**: un umbral pone el CI rojo
desde el primer día por lo que ya está triado, y así es como muere un control.

**Lo que NO se afirma.** No se ha medido la alcanzabilidad de ninguno de esos avisos, ni se ha
comprobado el dato del IDE con un escáner propio. Registrar la ausencia del control es distinto de
afirmar que hay riesgo explotable — eso habría que demostrarlo, como hizo PT-123 con TD-015.

**Cómo se comprueba hoy:** no se comprueba. Ése es el punto.

---

### TD-017 — Los `package-lock.json` sin política, y generados en la plataforma equivocada
**Status: CERRADA — 2026-07-28 (PT-135).** Registrada y cerrada en el mismo PT: la contradicción
existía desde meses antes, sin entrada en ningún registro.

**Qué había.** `.gitignore:40` ignoraba `package-lock.json` en todo el repositorio bajo el rótulo
«regenerated by npm». Mientras la regla decía eso, **dos de los tres locks estaban seguidos** (raíz y
`src/api`, metidos a la fuerza en `5c16af4`, sin ADR ni entrada en `HISTORY.log`) **y el tercero no**
(`src/admin`, que existía en disco y en ninguna otra máquina). Y ninguno tenía política sobre **dónde**
se genera: PT-126 regeneró el del API en Windows y lo dejó sin los binarios nativos de Linux, con lo
que el contenedor del API murió al arrancar y con él los otros cuatro.

**Cómo se cerró.**

| | |
|---|---|
| La regla se **retira** de `.gitignore` — no se declara una excepción | Una regla que dice lo contrario de lo que el repositorio hace es una trampa para quien la lea y la respete |
| `src/admin/package-lock.json` regenerado en su contenedor y **seguido por git** | Era la mitad del inventario que faltaba |
| `scripts/solo-en-contenedor.js` como `preinstall` en los tres puntos de instalación | Convierte la invariante en mecanismo. **Sin puerta de escape** |
| `scripts/regenerar-lock.js` + `npm run lock:api` / `lock:admin` / `lock:root` | El camino correcto pasa a ser el más corto. Un procedimiento que exige memoria ya falló una vez |
| `npm ci` en las imágenes de `api` y `admin`, en los **ocho** jobs y en el `postinstall` de la raíz | Hasta ahora el lock era una sugerencia: cada build volvía a resolver |
| Excepción **declarada y vigilada**: `tests/qa-browser-suite/` | Instala en el host porque Playwright conduce un navegador real. Segura porque su lock tiene **cero** paquetes por plataforma, y hay una prueba que comprueba que siga siendo cero |

**Decisión registrada en:** ADR-048 · **Regla:** `11-Conventions.md` RULE-15.

**Cómo se comprueba:** `lock-declara-plataformas.spec.ts` (12 pruebas, 5 casos de control) ·
`solo-en-contenedor.spec.ts` (8 pruebas, 2 casos de control) · y en el host,
`npm --prefix ./src/api install` **tiene que fallar**.

**Lo que NO se afirma.** `npm ci` **no** habría evitado el defecto: instala el lock, y el lock estaba
mal. Lo que lo impide es el `preinstall`; lo que lo caza es la guarda. `npm ci` sirve para otra cosa —
que el fichero mande de verdad.

---

### TD-024 — `@ironloot/core` es en su mayor parte una librería que nadie importa
**Abierta 2026-07-30 · PT-191 (al cerrar AUD-006/AUD-010/AUD-012) · Severidad: MEDIA · Esfuerzo: M**

**La cifra, que es de lo que trata esta entrada.** Al cerrar AUD-012 —que nombraba *un* símbolo
huérfano, el VO `Money`— se midió el conjunto: **30 de los 42 símbolos exportados por `core` no tenían
un solo consumidor fuera de `core`.** El hallazgo no describía un descuido puntual; describía el 71 % de
la librería. Tras retirar lo que este PT retiró quedan **24**, contados y declarados uno a uno en
`src/api/test/unit/dominio/core-sin-superficie-huerfana.spec.ts`.

**Qué son los 24.** Las *puertas* de una arquitectura hexagonal cuyos adaptadores no se escribieron
nunca: los cuatro `I*Repository` con sus `*Summary`, los contratos de integración (`IPaymentProvider`,
`IEmailService`, `IStorageService`, CFDI), cuatro eventos que nadie emite y dos DTO de paginación. PT-042
ya retiró la otra mitad de ese diseño —los cuatro casos de uso— con la razón escrita en
`src/packages/core/src/index.ts`: *«tested but never wired into the API»*.

**Por qué NO se retiran aquí.** Retirar los puertos es **abandonar formalmente el diseño hexagonal**, y
eso es una decisión de arquitectura que se toma con una ADR y con el humano delante, no con un borrado al
final de una sesión larga. Lo que sí se hizo es lo que faltaba para poder decidirlo: **medirlo**.

**Por qué no es cosmético.** Un contrato muerto no se ignora como el código muerto: **se lee**.
`core/integrations/payment-provider.interface.ts` declara qué debe cumplir una pasarela… y el contrato
vivo es otro, el del API (`modules/payments/interfaces/`). Quien lea `core` para aprender el sistema
obtiene una respuesta que no se aplica en ninguna parte y que puede divergir sin que nada proteste. Es la
familia de **H-016**: *un documento con citas rotas se lee con confianza y es falso.*

**Lo que ya está protegido.** La guarda impide que la cifra **crezca**: un símbolo exportado nuevo sin
consumidores rompe la prueba con su nombre y su fichero, y un declarado que deja de serlo también
(`AC-02`), para que la lista no acabe describiendo un pasado.

**Cómo comprobar el estado:** `npx jest --testPathPattern="core-sin-superficie" --no-coverage` — el caso
`C3` imprime la cuenta viva.

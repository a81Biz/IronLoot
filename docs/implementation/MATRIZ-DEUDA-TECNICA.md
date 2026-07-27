# MATRIZ DE DEUDA TÉCNICA — orden de ejecución

**Emisión**: 2026-07-27 · **Autorización**: el desarrollador delega los gates
(«toma las decisiones… no te detienes hasta terminar»). Queda registrado como ACK delegado.

**Regla de la matriz**: todo hallazgo nuevo que aparezca durante un ciclo **entra aquí** y recibe
su propio ciclo FDGE. Nada se anota «para después».

---

## Verificación previa — el registro mentía en tres sitios

Antes de ordenar se comprobó cada deuda contra el código. Ordenar sobre datos falsos habría
producido una matriz falsa.

| Deuda | Decía | Es |
|---|---|---|
| **TD-007** | Open — `enableSeller()` sin cobertura del gate KYC | **Ya cerrada**: PT-079 añadió los tests de rechazo (`users.service.spec.ts:313,325,335`) |
| **TD-003** | Verificación del método de pago «mockeada» | **A medias**: la existencia SÍ se valida (`withdrawals.service.ts:36-37`). Lo muerto es `isVerified`: se escribe `false` al crear y **nadie lo pone nunca a `true`**, ni nadie lo comprueba |
| **TD-004** | TOTP admin «no documentado» | **Sí documentado** en `.env.example:135`. Lo real es que es **opcional**: sin `ADMIN_TOTP_SECRET` el panel entra solo con usuario y contraseña |

---

## Criterio de orden

1. **Primero lo que desbloquea confianza en el propio registro.** Si la matriz miente, todo lo
   que se priorice sobre ella miente.
2. **Después los puntos ciegos.** Un linter que no corre no es una molestia: es superficie de
   defecto desconocida. Corregirlo *alimenta* la matriz.
3. **Luego el camino del dinero.**
4. **Después lo operativo** (arranque, entorno).
5. **Al final lo grande y estructural.**
6. **Lo bloqueado no se intenta**: se registra con su bloqueo explícito.

---

## Orden de ejecución

| # | PT | Deuda | Tipo | Por qué aquí |
|:-:|---|---|---|---|
| 1 | **PT-090** | TD-007, TD-003(parte), TD-004(parte), H-006, registros desincronizados | BUG doc | El registro miente en tres deudas y hay 11 PT sin cerrar. Barato y hace fiable todo lo demás |
| 2 | **PT-098** | **F-25** — la puja en vivo no funciona en el navegador | STANDARD | **Hallazgo nuevo, PT-090.** Rompe la funcionalidad insignia del producto, y en silencio |
| 3 | **PT-091** | **TD-012** — tres de cuatro servicios no se lintean | STANDARD | El punto ciego más grande. Su resultado **alimenta la matriz** con hallazgos nuevos |
| 4 | **PT-099** | **F-26** — `npm test` en la raíz deja fuera 205 tests | TRIVIAL | **Hallazgo nuevo, PT-091.** Misma clase que TD-012: un script que aparenta cobertura que no tiene. Barato |
| 5 | **PT-092** | **TD-003** — el método de retiro nunca se verifica | STANDARD | Camino del dinero: se retira a una CLABE que nadie confirmó que sea del usuario |
| 6 | **PT-093** | **TD-004** — el panel admin entra sin segundo factor | STANDARD | Seguridad: el contexto de más privilegio protegido solo por contraseña |
| 7 | **PT-094** | **TD-013** — `docker restart` deja ADMIN caído | TRIVIAL | Operativo, barato, cuesta desconcierto cada vez |
| 8 | **PT-095** | **TD-011** — los flujos autenticados dependen del hosts | STANDARD | Un checkout limpio no arranca y falla en silencio |
| 9 | **PT-100** | **F-30** — la sesion de ADMIN no persiste en el subdominio | STANDARD | **Hallazgo nuevo, PT-097.** 24 checks de administracion caidos |
| 10 | **PT-096** | **TD-010 + TD-005** — JS inline y `unsafe-inline` en CSP | MAJOR | Son el mismo problema. Grande y estructural: va al final |
| 11 | **PT-097** | Suites completas | VERIFICACIÓN | Cierra el conjunto. La última corrida completa es **anterior** a PT-087/088/089 |

### No se intentan — bloqueadas por algo externo

| Deuda | Bloqueo |
|---|---|
| **TD-001 / H-005** — CFDI/PAC | Exige **contratar un PAC certificado ante el SAT**. Ninguna decisión técnica lo desbloquea |
| **TD-002** — Stripe y HeyBanco | Exige **credenciales** de ambas pasarelas |
| **F-27** — Tarjeta como **destino de retiro** | Exige contratar **dispersión** (*Money Out* de Mercado Pago o similar). Verificado en PT-092: el SDK no expone ningún cliente de dispersión —`grep` sobre `node_modules/mercadopago/dist/clients/` no devuelve *payout*, *money out* ni *transfer*—. Decisión del desarrollador (2026-07-27): la tarjeta **verifica y cobra**; el retiro va a CLABE o PayPal. En México la tarjeta de débito suele tener CLABE asociada, así que el caso queda cubierto por esa vía |
| **TD-009** — un 401 no garantiza el cese de reintentos | Comportamiento de la pasarela, no nuestro. Lo que protege es la deduplicación, y está |

---

## Seguimiento

| PT | Estado | Hallazgos nuevos que generó |
|---|---|---|
| PT-090 | ✅ VALIDATION_PENDING | **F-25** — la puja en vivo apunta a `http://api:3000`, inalcanzable desde el navegador |
| PT-098 | ✅ VALIDATION_PENDING | Ninguno. Queda por revisar si hay otros namespaces de WebSocket con el mismo defecto (se mira en PT-097) |
| PT-091 | ✅ VALIDATION_PENDING | **F-26** — los scripts de la raíz (`test`, `lint:check`, `typecheck`, `build`) solo cubren la API |
| PT-099 | ✅ VALIDATION_PENDING | — |
| PT-092 | ✅ VALIDATION_PENDING | **F-27** — depositar a tarjeta exige dispersión que no tenemos (bloqueado, registrado) |
| PT-093 | ✅ VALIDATION_PENDING | — |
| PT-094 | ✅ VALIDATION_PENDING | — |
| PT-095 | ✅ VALIDATION_PENDING | — |
| PT-096 | PENDIENTE | — |
| PT-097 | ✅ VALIDATION_PENDING | **F-28** — la API no arrancaba (`PaypalProvider` sin exportar) y **la suite de QA no lo comprobaba** |

---

## Hallazgos nuevos generados durante la ejecución

### F-25 — La puja en vivo no llega al navegador (detectado en PT-090)

**Cadena verificada**:

| Eslabón | Evidencia |
|---|---|
| CLIENT recibe la dirección **interna** de Docker | `docker exec ironloot-client sh -c 'echo $API_URL'` → `http://api:3000` |
| El controlador se la pasa a la vista | `app.controller.ts:269` — `return { …, apiUrl: API_URL }` |
| La vista abre el WebSocket contra ella | `detail.html:69` — `io(API + '/auctions', …)` con `const API = '{{ apiUrl }}'` |

El navegador intenta conectar a `http://api:3000/auctions`, que **no resuelve fuera de la red de
Docker**. Está envuelto en un `try` y socket.io reintenta por su cuenta: **falla en silencio**. La
página funciona —la cuenta atrás corre con un `setInterval` local— y las pujas de otros
simplemente no aparecen.

Es la misma clase que F-17/F-21: una dirección interna o con puerto escapando en algo que sale del
sistema. PT-088 y PT-089 la persiguieron en las URLs de retorno, de correo y de ficheros; esta
quedó fuera porque nadie miró el WebSocket.

**Ironía útil**: la investigación H-006 preguntaba exactamente por esto —si el JS del navegador
degrada el patrón BFF— y llevaba abierta desde el 23-jun. La respuesta era que no lo degrada
(nadie llama al API directamente con token), pero al comprobarlo apareció que la única línea que
sí usa `apiUrl` está rota.

**Nota**: nginx ya reenvía WebSocket en el bloque de `client` (`Upgrade` en `nginx.conf:95`), de
modo que una conexión **relativa** al mismo origen funcionaría sin tocar infraestructura.

### F-26 — Los scripts de la raíz aparentan una cobertura que no tienen (detectado en PT-091)

`package.json` de la raíz:

```
"test":       "npm --prefix src/api run test"
"lint:check": "npm --prefix src/api run lint:check"
"typecheck":  "npm --prefix src/api run typecheck"
"build":      "npm --prefix src/api run build"
```

**Medido**: `npm test` en la raíz ejecuta **406 tests** y deja fuera los **71 de CLIENT** y los
**134 de CORE**. Quien lo ejecuta —o un CI que lo llame— cree haber probado todo el proyecto.

Es exactamente la misma clase que TD-012, un nivel más arriba: un script que existe, funciona, y
cubre menos de lo que su nombre promete. Peor que fallar, porque no avisa.

**Además**: el `postinstall` de la raíz (`npm --prefix src/api install`) **rompe `npm install`
dentro de cualquier workspace** — `src/apps/*` y `src/packages/*` son workspaces npm, así que su
instalación delega en la raíz y el `postinstall` falla al no resolver la ruta relativa. Se
descubrió al instalar eslint: hubo que hacerlo con `npm install --workspaces` desde la raíz.

### F-28 — La suite no comprobaba que la API arrancara (detectado en PT-097)

Al recrear el contenedor para correr las suites, **la API no arrancó**:

```
Nest can't resolve dependencies of the AccountVerificationService
(..., ?). Please make sure that the argument PaypalProvider at index [4]
is available in the WalletModule context.
```

`PaymentsModule` no exportaba `PaypalProvider`, que PT-092 necesitaba desde `WalletModule`.

**Los 458 tests unitarios pasaban.** Construyen `TestingModule` aislados con dobles, y **nunca
ejercitan el grafo real** de módulos. Ese hueco solo se ve levantando la aplicación.

Y el segundo, más incómodo: la fase de humo recorre BASE, CLIENT y ADMIN, que son **SSR**. Con la
API muerta, sus páginas renderizan igual con datos vacíos y la suite pasa. **La suite de QA no
comprobaba que la API arrancara.**

Ambos corregidos en PT-097. Es el argumento entero de este PT en un solo caso: cinco PT se
acumularon sobre una suite sin correr, y el fallo era de los que impiden arrancar.

---

## Estado — 2026-07-27

| Deuda | Estado |
|---|---|
| TD-003 | ✅ cerrada (PT-092) |
| TD-004 | ✅ cerrada (PT-093) |
| TD-007 | ✅ cerrada (PT-090, ya lo estaba desde PT-079) |
| TD-011 | ✅ mitigada (PT-095) |
| TD-012 | ✅ cerrada (PT-091) |
| TD-013 | ✅ cerrada (PT-094) |
| TD-005 + TD-010 | pendiente — **PT-096**, el grande |
| TD-001, TD-002, TD-009, F-27 | bloqueadas por dependencia externa o riesgo aceptado |

**Hallazgos generados durante la ejecución**: F-25 (puja en vivo), F-26 (scripts de la raíz),
F-27 (dispersión a tarjeta, bloqueado), F-28 (la API no arrancaba). Los tres accionables se
resolvieron dentro de la serie, que era la regla que la matriz impuso.

### F-30 — La sesion del panel ADMIN no persiste en el subdominio (detectado en PT-097)

Al apuntar la suite a `admin.ironloot.local` —necesario para que la cookie de PT-088 funcione—
**el panel de administracion dejo de mantener la sesion en el navegador**: 24 checks que pasaban
con `localhost:3001` ahora rebotan a `/login` (`bouncedToLogin: true`, HTTP 200).

Lo verificado:

| Comprobacion | Resultado |
|---|---|
| `POST /login` por el subdominio | **HTTP 302**, correcto |
| Cabecera emitida | `connect.sid=…; Path=/; HttpOnly; SameSite=Lax` — sin `Domain`, host-only |
| Con `localhost:3001` (corrida anterior) | admin-writes **4/4**, authed **20/20** |
| Con `admin.ironloot.local` | admin-writes **0/4**, 20 checks de admin rebotando |

La cookie se emite bien y el login responde bien: el fallo esta en algun punto entre eso y la
peticion siguiente del navegador. Candidatos por descartar: el almacen de sesion (`express-session`
por defecto es en memoria, y el contenedor se recreo durante PT-094), `connect-redis` si esta
activo, y que `admin.ironloot.local` sobre HTTP **no es contexto seguro** mientras `localhost` si
lo es —lo que cambia el trato de algunas politicas del navegador—.

**No se diagnostico a fondo ni se arreglo a ojo.** Es un hallazgo nuevo, con su propio ciclo:
**PT-100**, siguiente en la matriz.

### PT-092 cambio el contrato del retiro, y la suite tenia que seguirlo

`QA-WD-05` fallaba con **HTTP 400** y arrastraba cuatro checks mas. **No es un defecto**: es el
gate de PT-092 funcionando —`CLABE verificada=false`, comprobado en la BD—. La suite registraba
una CLABE y retiraba sin verificarla, que es exactamente lo que TD-003 permitia y PT-092 cerro.

Se anade `QA-WD-04b`, que verifica la cuenta antes de retirar y comprueba de paso que un codigo
incorrecto falla y el correcto verifica.

### F-31 — ADMIN no tiene infraestructura de tests (detectado en PT-100)

PT-091 le dio linter a los cinco proyectos, pero **ADMIN sigue sin `test` en su `package.json` ni
carpeta de pruebas**. Es el unico de los cinco en esa situacion, y es el panel de mas privilegio
del sistema.

Consecuencia inmediata: la guarda de PT-100 tuvo que ir a la suite de navegador en vez de a un
test unitario.

Pendiente de ciclo propio.

---

## Hallazgos de la validación de PT-090…101 (27-jul-2026)

La guía `docs/implementation/VALIDACION-PT-090-101.md` se ejecutó entera contra el entorno real.
**168/168** en la suite de navegador y **691/691** en las unitarias, pero salieron dos hallazgos
—**los dos míos**— que impiden validar dos de los trece PT. Detalle completo en la §13 de esa guía.

| # | PT | Hallazgo | Complejidad | Por qué entra aquí |
|:-:|---|---|---|---|
| 12 | **PT-102** | **F-34** — la puja en vivo está apagada: `pages-auction-detail.js` se ejecuta antes que socket.io | STANDARD | **Hallazgo nuevo, validación de PT-096.** Regresión sobre PT-098 en el mismo producto que PT-098 vino a arreglar. Bloquea validar PT-096 |
| 13 | **PT-103** | **F-33** — cuatro deudas cerradas siguen `Open` en el registro | TRIVIAL | **Hallazgo nuevo, validación de PT-090.** Es el defecto que PT-090 existía para corregir, reintroducido. Bloquea validar PT-090 |

### F-34 — PT-096 apagó la puja en vivo (detectado validando PT-096)

**Dimensión D1 · CRÍTICA · BUG.** En `views/pages/auction/detail.html` el `<script src>` de la
página quedó **delante** del `<script>` del CDN de socket.io. `pages-auction-detail.js` llama a
`io('/auctions', …)` cuando `io` aún no existe; el `ReferenceError` lo absorbe el `try/catch`
rotulado *«live feed is optional»*, y no queda rastro en consola.

| Comprobación | Resultado |
|---|---|
| Orden real de los `<script>` en el navegador | `1. pages-auction-detail.js` · `2. socket.io (CDN)` |
| Tráfico `socket.io` que genera la página | **sólo la descarga del CDN**; ningún handshake |
| Sonda manual `io('/auctions')` en esa misma página | **conecta**, `transporte: websocket` |
| Handshake por nginx y directo al API | HTTP **200** en ambos |
| Orden antes de `b4e7261` (PT-096) | CDN en línea 46, código de la puja en línea 49 — **correcto** |

Tres redes lo dejaron pasar: el `catch` vacío, una suite que prueba la puja por HTTP pero nunca
que el **otro** navegador se entere, y el guardia de PT-096, que vigila el JS inline pero no el
**orden** de los scripts.

### F-33 — El registro de deuda técnica volvió a contradecir al código (detectado validando PT-090)

**Dimensión D4 · ALTA · BUG.** `10-Technical-Debt.md` marca `Open` cuatro deudas cerradas en el
código: **TD-003** (PT-092), **TD-005** y **TD-010** (PT-096), **TD-012** (PT-091). Cerrar una
deuda toca dos sitios y nada obliga al segundo — que es literalmente el diagnóstico de PT-090.

Corregir las filas no basta: hace falta una prueba que falle cuando un `TD-XXX` citado como
cerrado en `HISTORY.log` siga `Open` en el registro. Sin eso habrá una tercera vez.

### Estado de las deudas, corregido

| Deuda | Estado real | Estado en el registro |
|---|---|---|
| TD-003 | ✅ cerrada (PT-092) | ❌ `Open` — **F-33** |
| TD-005 | ✅ cerrada (PT-096) | ❌ `Open` — **F-33** |
| TD-010 | ✅ cerrada (PT-096) | ❌ `Open` — **F-33** |
| TD-012 | ✅ cerrada (PT-091) | ❌ `Open` — **F-33** |

**Efecto colateral**: **PT-098** tampoco puede validarse. Su arreglo (URL relativa del socket) es
correcto y está en el código, pero F-34 impide que ese código se ejecute, así que su criterio de
aceptación —el precio cambia en la otra ventana sin recargar— no se puede demostrar. Se valida
solo, con la misma prueba, en cuanto F-34 se cierre.

**Ninguno de los dos se toca sin ACK humano**: FDGE prohíbe diseñar solución antes de validar el
diagnóstico (STATE 1-B), y F-34 es precisamente lo que ocurre al cambiar código «obvio» sin medir
el resultado después.

### F-35 — `QA-PP-09` mide un delta sobre un monedero que otra fase puede tocar (detectado en PT-102)

**Dimensión D5 · BAJA · BUG de prueba.** En la corrida completa de PT-102:

```
QA-TR-03  FAIL  Cobro real aprobado en Mercado Pago :: status=processing
QA-PP-09  FAIL  El monedero se acredita por el importe exacto :: 99049 → 99507.9
```

El delta es **458.90**, y el ledger dice por qué:

```
DEPOSIT | 321.50 | PAYPAL        ← lo que QA-PP-09 esperaba
DEPOSIT | 137.40 | MERCADO_PAGO  ← se acredito DENTRO de la ventana de medicion
```

El depósito de Mercado Pago que `QA-TR-03` vio en `processing` lo acreditó la vía garantizada
mientras corría la fase de PayPal. **El sistema hizo lo correcto**; la prueba es la que asume que
nadie más toca ese monedero entre sus dos lecturas.

`QA-PP-09` debería medir el crédito **de su propio pago** —por `Payment.reference`, que es única
desde PT-087— en vez de restar dos saldos. Ninguna de las dos fases es culpable: lo es la forma de
medir.

**No bloquea nada.** Se registra para que la próxima corrida roja no se interprete como regresión.

---

## Cierre de los tres ciclos abiertos por la validación (27-jul-2026)

F-33, F-34 y F-35 pasaron su ciclo FDGE completo —STATE 1-B → 2 → 3 → 4 con tests en RED → 5 → 6 →
7— y están fusionados a `master`.

| PT | Hallazgo | Qué se arregló | Qué queda impidiendo que vuelva |
|:--|:--|:--|:--|
| **PT-102** | F-34 (D1, CRÍTICA) | El orden de los `<script>` con `defer`; el `catch` deja de ser mudo | `orden-de-scripts.spec.ts` (con casos de control) + fase 32 de la suite, dos navegadores |
| **PT-103** | F-33 (D4, ALTA) | Cuatro filas del registro, comprobadas **contra el código** | `coherencia-deuda-tecnica.spec.ts` cruza `HISTORY.log` con el registro |
| **PT-104** | F-35 (D5, BAJA) | El crédito se mide por `reference`, no restando saldos | La medición nueva detecta además asiento duplicado y monedero equivocado |

### Lo que salió al verificar, y no estaba previsto

Los tres PT produjeron hallazgos que sólo aparecen al comprobar de verdad:

| De dónde salió | Qué |
|:--|:--|
| PT-102 | **F-35**: `QA-PP-09` medía un delta que otra fase podía tocar |
| PT-103 | **TD-005 no estaba del todo cerrada**: PT-096 limpió `script-src`, pero `style-src` conserva `'unsafe-inline'`. Registrada aparte como **TD-014** en vez de esconderla tras un cierre a secas |
| PT-103 | **`PENDING_TASKS.md`** llevaba nueve trabajos como `PENDING` que ya estaban hechos. El desfase de F-33 en otro fichero |
| PT-104 | **La fase 70 trataba `/v1/orders` como síncrona.** Con `processing` se rendía, y sus **doce** comprobaciones de traza no se ejecutaban nunca. Ahora: 4 casos → 16, todos verdes |

### Reglas nuevas, nacidas de los hallazgos

| Regla | De dónde | Qué dice |
|:--|:--|:--|
| **RULE-07** | F-34 | Una dependencia entre scripts se declara (`defer` + orden), no se hereda de la posición. Y un `try/catch` sobre una función del producto **registra algo** |
| **RULE-08** | F-33 | Cerrar una deuda son **dos** escrituras, y el estado nuevo **cita qué leer** para comprobarlo |

### Estado de la matriz

| Deuda | Estado |
|:--|:--|
| TD-003 · TD-004 · TD-005 (`script-src`) · TD-007 · TD-010 · TD-012 · TD-013 | ✅ cerradas, y **el registro ya lo dice** |
| TD-011 | ✅ mitigada (PT-095) |
| **TD-014** | 🆕 abierta — `style-src 'unsafe-inline'` en los tres sitios |
| TD-001 · TD-002 · TD-009 · F-27 | bloqueadas por dependencia externa o riesgo aceptado |

**Nada pendiente de implementar.** Lo que queda es validación humana: quince PT (PT-090…PT-104).

### F-36 — TD-013 se cerró solo para ADMIN; BASE tiene la misma avería (detectado en PT-105)

**Dimensión D2 · MEDIA · BUG.** Al reiniciar los tres sitios para probar la CSP de PT-105:

```
base    HTTP 503   Error: Cannot find module './app.module'   MODULE_NOT_FOUND
client  HTTP 404   (healthy)
admin   HTTP 302   (healthy)
```

`docker restart` borra el `dist/` y el arranque no lo regenera a tiempo. **Es exactamente TD-013**,
que PT-094 cerró — pero solo en ADMIN:

| Sitio | `nest-cli.dev.json` con `deleteOutDir: false` |
|---|---|
| ADMIN | ✅ (PT-094) |
| BASE | ❌ |
| CLIENT | ❌ |

Es el patrón que PT-101 ya nombró: **arreglar donde se observó y no donde vive**. TD-013 se
diagnosticó en ADMIN porque fue donde se notó, y la causa —la configuración de compilación en
desarrollo— es idéntica en los tres.

**Cuesta poco y confunde mucho**: quien reinicie BASE ve un 503 sin explicación y la salida es
`docker-compose up -d --force-recreate`, que no es evidente.

Se le abre ciclo propio (**PT-108**). No se arregla dentro de PT-105: mezclarlo haría el commit
irrevisable.

### F-37 — `qa-out/` esta versionado: 1851 ficheros de artefactos de prueba (detectado en PT-109)

**Dimensión D2 · BAJA · BUG.** `git ls-files qa-out/` devuelve **1851 ficheros**, casi todos
capturas de corridas del 24-jul. El `.gitignore` no menciona `qa-out/`.

Es la misma familia que PT-106 —artefactos de prueba dentro del repositorio— en otro sitio y más
grande. Las seis corridas de hoy no están versionadas porque nadie las añadió, no porque algo lo
impida: el próximo `git add -A` mete 1851 más.

Salida: `git rm -r --cached qa-out/` + entrada en `.gitignore`. El historial de las corridas viejas
queda en los commits antiguos. **No se hace sin decisión del humano**: sacar 1851 ficheros del
índice no es una llamada del agente.

### F-38 — El contenedor de ADMIN no compila: los tests de PT-101 quedan fuera de `rootDir` (detectado en PT-110)

**Dimensión D2 · ALTA · BUG.** `ironloot-admin` quedó `unhealthy` y **21 checks de ADMIN fallaron**
en la corrida de verificación de PT-110:

```
error TS6059: File '/app/test/admin-api-client.spec.ts' is not under 'rootDir' '/app/src'.
error TS6059: File '/app/test/auth.guard.spec.ts' is not under 'rootDir' '/app/src'.
Found 2 errors. Watching for file changes.
```

**No lo causó el cambio de dependencias de PT-110** —sólo tocó `src/api/package.json`— sino
**PT-101**, que creó esos dos tests. `src/admin/tsconfig.json` declara `rootDir: ./src` y **no
declara `exclude`**, así que el `include` por defecto (`**/*`) recoge los tests que la imagen
contiene en `/app/test`.

**Por qué sobrevivió tres semanas**: PT-094 puso `deleteOutDir: false` para que un `docker restart`
no dejara ADMIN sin `dist`. Ese mismo `dist` conservado es lo que hacía que el panel siguiera
sirviendo **con código viejo** mientras la compilación fallaba en silencio. El arreglo de una
avería tapaba otra.

Es la cuarta vez del mismo patrón —un fallo que no se ve— y la segunda que un PT mío rompe algo que
otro PT mío acababa de poner (PT-107 ya rompió la guarda de PT-106).

**Salida**: `exclude` en el `tsconfig.json` de ADMIN, como ya tienen los otros proyectos.

### F-39 — Las sesiones de ADMIN nunca han estado en Redis (detectado en PT-111)

**Dimensión D2 · MEDIA · BUG.** `main.ts:70` dice:

```ts
// PT-013: Redis session store for admin (BRECHA-8 resolved)
const RedisStore = require("connect-redis").default;
```

**`connect-redis@9` no tiene `default`.** Exporta `RedisStore` con nombre:

```
connect-redis exporta: RedisStore
.default es: undefined
.RedisStore es: function
```

Así que `new undefined(...)` lanza, el `catch` se dispara y el panel arranca con:

```
[Admin] Redis unavailable — using in-memory session store (not for production)
```

**Redis está levantado y sano.** No es que no estuviera disponible: es que nunca se llegó a
intentar usarlo. El mensaje de la caída culpa a la infraestructura de un error del código, que es
la peor clase de mensaje: manda a buscar donde no está.

Dos consecuencias medidas:

1. **Las sesiones viven en memoria.** Un reinicio del panel cierra la sesión de todos, y el propio
   mensaje dice «not for production».
2. **77 errores `ECONNREFUSED`** en el log de un cliente `ioredis` huérfano que nadie cerró y que
   reintenta para siempre. Además, `docker-compose` no le pasa `REDIS_URL` a ADMIN, así que apunta
   a `localhost:6379` — que dentro del contenedor no es Redis.

**Y el comentario del código afirma «BRECHA-8 resolved»**, que es falso desde que se subió
connect-redis a la v9. Es F-33 otra vez, en un comentario en vez de en un registro.

**Corrección de mi propio diagnóstico**: primero supuse que el `catch` no se disparaba porque
`new Redis()` falla en asíncrono. Lo comprobé y era falso — el log sí traía el aviso. La causa real
es el `.default` inexistente. Se anota porque la hipótesis equivocada era plausible y alguien podría
repetirla.

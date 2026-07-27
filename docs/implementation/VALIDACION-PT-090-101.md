# Guía de validación — PT-090 … PT-101

**Fecha**: 2026-07-27 · **Rama**: `master` (todo fusionado, árbol limpio, **sin empujar**)
**Estado de los trece**: `VALIDATION_PENDING`

> **Por qué existe esta guía.** FDGE dice que el agente no cierra bugs. Estos trece PT están
> terminados y verificados por mí, pero la confirmación es tuya. Cada bloque de abajo te dice
> **qué se afirma**, **cómo comprobarlo** y **qué deberías ver**. Si algo no coincide, ese PT no
> se valida — y eso es información, no un fracaso.

> **▶ Ejecutada el 27-jul-2026, y los hallazgos ya cerrados.** La guía se corrió entera
> —navegador real, Docker, `npm test`— y salieron dos defectos, ambos míos (**F-33** y **F-34**),
> que bloqueaban tres PT. Los dos pasaron su ciclo FDGE completo y están fusionados a `master`:
> **PT-102** (F-34), **PT-103** (F-33) y **PT-104** (F-35, salido de PT-102).
>
> **Los trece son ahora validables**, y con ellos PT-102/103/104: quince en total. El resultado de
> la corrida está en **[§13](#13-resultado-de-la-ejecución-automatizada-27-jul-2026)** y el cierre
> en **§14**.

---

## 0. Preparación — cinco minutos

### 0.1 El fichero hosts

**Sin esto, nada de lo autenticado funciona** (es TD-011, y PT-095 avisa al arrancar).
Comprueba que existen:

```
127.0.0.1  ironloot.local
127.0.0.1  base.ironloot.local
127.0.0.1  client.ironloot.local
127.0.0.1  admin.ironloot.local
127.0.0.1  api.ironloot.local
```

Windows: `C:\Windows\System32\drivers\etc\hosts` como Administrador.

### 0.2 Levantar el entorno

```bash
cd C:/DevOps/Desarrollos/IronLoot
docker-compose up -d
```

Espera a que todo esté `healthy`:

```bash
docker ps --format "{{.Names}}\t{{.Status}}"
```

> ⚠️ Si ADMIN sale `unhealthy`, **recréalo, no lo reinicies**: `docker-compose up -d --force-recreate admin`.
> (PT-094 lo corrigió para el arranque normal; ver su bloque.)

### 0.3 La comprobación que lo resume todo

```bash
npm test
```

**Esperado**: cinco bloques en verde — **458 + 83 + 134 + 13 + 3 = 691 tests**.

Si esto pasa, el 80 % de lo afirmado está confirmado. El resto son cosas que sólo se ven en el
navegador o contra una pasarela real.

---

## 1. PT-090 — El registro dejó de contradecir al código

**Qué se afirma**: tres deudas estaban mal descritas y se corrigieron con cita; `PENDING_TASKS.md`
mentía sobre cuatro PT.

**Cómo comprobarlo** — abre `docs/enterprise-documentation/10-Technical-Debt.md` y busca TD-003:

```bash
grep -A6 "^### TD-003" docs/enterprise-documentation/10-Technical-Debt.md
```

**Qué deberías ver**: que **no** dice «verificación mockeada», sino que la comprobación de
existencia sí está activa y que el defecto real era `isVerified`. Y comprueba tú mismo la cita:

```bash
grep -rn "isVerified: true" src/api/src/    # antes de PT-092: vacío
```

**Se valida si**: cada corrección que leas resuelve a una línea real de código.

---

## 2. PT-098 — La puja en vivo llega al navegador

> ✅ **Esta prueba ya funciona.** Estuvo bloqueada por **F-34** —PT-096 dejó el `<script>` de la
> página antes que el de socket.io, y el código de la puja nunca llegaba a ejecutarse—. Lo cerró
> **PT-102**, y la propagación está medida en dos navegadores: `$700 → $950` sin recargar. Si
> prefieres no hacerla a mano, `node tests/qa-browser-suite/32-puja-en-vivo.cjs` la reproduce.

**Qué se afirma**: el WebSocket apuntaba a `http://api:3000` —interna de Docker— y fallaba en
silencio. La funcionalidad insignia del producto no existía.

**Cómo comprobarlo** — necesitas **dos navegadores** y una subasta activa:

1. Crea una subasta y publícala (o usa una existente `ACTIVE`).
2. Abre `http://client.ironloot.local/auctions/<id>` en **dos ventanas**, con usuarios distintos.
3. Puja desde la primera.

**Qué deberías ver**: el precio y la lista de «Pujas recientes» **cambian en la segunda sin
recargar**.

Comprobación técnica, en la consola del navegador (pestaña Red → WS):

```
ws://client.ironloot.local/socket.io/?EIO=4&transport=websocket
```

**Se valida si**: la conexión va a `client.ironloot.local`, **no** a `api:3000`.

---

## 3. PT-091 — Los cinco proyectos se lintean

**Qué se afirma**: eslint no estaba ni declarado en tres proyectos; ahora los cinco pasan sin
errores.

```bash
npm run lint:check
```

**Qué deberías ver**: los cinco ejecutan y ninguno reporta **errores** (avisos sí: `no-console`,
`no-explicit-any` — no se tocaron, y está dicho).

**Prueba adicional** — el hook cubre los cinco. Toca un fichero de ADMIN y haz un commit de
prueba: verás `-> lint-staged en src/admin`.

---

## 4. PT-092 — Verificación de la cuenta de cobro (cierra TD-003)

**Qué se afirma**: no se puede retirar a una cuenta que nadie ha verificado.

**Cómo comprobarlo** — el camino completo, con un vendedor que tenga KYC aprobado y saldo:

```bash
# 1. Registrar una CLABE
POST http://client.ironloot.local/api/v1/wallet/payment-methods
     { "clabe": "646180110400000007", "holderName": "Tu Nombre" }

# 2. Intentar retirar → debe RECHAZAR
POST /api/v1/wallet/withdrawals   { "amount": 100, "paymentMethodId": "<clabe>" }
```

**Qué deberías ver**: `HTTP 400` — *«Esta cuenta aún no está verificada…»*

```bash
# 3. Abrir la verificación
POST /api/v1/wallet/payment-methods/<id>/verify
```

**Qué deberías ver**: importe **20 MXN**, y **el código NO viene en la respuesta** — si viniera,
quien pide la verificación lo sabría sin haber accedido nunca a la cuenta, y no probaría nada.

```bash
# 4. El código, que en producción llega en el concepto del SPEI:
docker exec ironloot-db psql -U ironloot -d ironloot_db -t -A -c \
  "SELECT token FROM account_verifications ORDER BY created_at DESC LIMIT 1"

# 5. Confirmarlo (prueba con uno incorrecto primero)
POST /api/v1/wallet/payment-methods/<id>/verify/confirm   { "token": "ZZZZZZ" }
POST /api/v1/wallet/payment-methods/<id>/verify/confirm   { "token": "<el real, en minúsculas>" }

# 6. Retirar de nuevo → ahora sí
```

**Se valida si**: el paso 2 rechaza, el 5 con código malo cuenta un intento, con el bueno
verifica **aunque lo escribas en minúsculas**, y el 6 devuelve `201`.

**Cardinalidad**: registra un PayPal, luego intenta un segundo. Debe rechazar **nombrando el que
ya existe**.

---

## 5. PT-099 — Los scripts de la raíz cubren los cinco proyectos

```bash
npm test 2>&1 | grep -c "^Tests:"
```

**Qué deberías ver**: `5`. Antes era 1 — `npm test` corría 448 y omitía 205.

---

## 6. PT-093 — Segundo factor obligatorio en producción

**Qué se afirma**: el arranque en producción se aborta sin `ADMIN_TOTP_SECRET`.

```bash
cd src/api && npx jest --testPathPattern="validate-startup-config"
```

**Qué deberías ver**: los cuatro casos de TOTP en verde — falla sin secreto, falla con secreto
corto, pasa con uno válido, **no aplica en desarrollo**.

**Se valida si** además compruebas que en desarrollo **no** te obliga: el panel sigue entrando con
usuario y contraseña, que es lo pretendido.

---

## 7. PT-094 — `docker restart` ya no tumba ADMIN

**La prueba es la operación que antes lo rompía**:

```bash
docker restart ironloot-admin
sleep 45
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: admin.ironloot.local" http://localhost/login
```

**Qué deberías ver**: `200`, y `docker ps` mostrando `healthy`.

---

## 8. PT-095 — El dominio deja de fallar en silencio

**Cómo comprobarlo** — provoca el fallo a propósito:

```bash
docker exec -e PUBLIC_DOMAIN=inexistente.local ironloot-api sh -c 'echo probando'
```

O más directo: cambia `PUBLIC_DOMAIN` en el `.env` raíz a algo que no resuelva, recrea el API y
mira los logs de arranque.

**Qué deberías ver**: un aviso que dice **qué falla, qué consecuencia tiene y qué líneas pegar** en
el fichero hosts. **No aborta** — es un problema del entorno, no del código.

---

## 9. PT-097 — Las suites completas

```bash
cd tests/qa-browser-suite && bash run-all.sh
```

> ⚠️ **Esto trunca 32 tablas de la base de datos.** Es un reset completo del entorno de QA.
> Tarda unos 15 minutos.

**Qué deberías ver**: `TOTAL 156 | PASS 155 | FAIL 1` o mejor.

El fallo esperable es `QA-TR-03` — Mercado Pago devuelve `processing` y la suite mira demasiado
pronto. Compruébalo tú:

```bash
# con el id de orden que reporte el fallo
curl -H "Authorization: Bearer $MP_TOKEN" https://api.mercadopago.com/v1/orders/<id>
```

**Se valida si** ese estado acaba en `processed / accredited`: entonces es latencia de la pasarela,
no defecto nuestro.

**Lo que este PT encontró**: la API no arrancaba y **la suite no lo comprobaba**. Ahora sí — verás
`2b) ARRANQUE DEL API` al principio.

---

## 10. PT-100 — La sesión de ADMIN en el subdominio

```
Abre http://admin.ironloot.local/login, entra, y navega a otra sección.
```

**Qué deberías ver**: que **no** te devuelve al login.

Comprobación técnica:

```bash
curl -s -D - -o /dev/null -H "Host: admin.ironloot.local" http://localhost/login | grep -i "content-security-policy" | tr ';' '\n' | grep -i upgrade
```

**Qué deberías ver**: **nada**. Si apareciera `upgrade-insecure-requests`, el navegador subiría
cada petición a `https://`, donde no escucha nadie — que es exactamente lo que rompía el panel.

---

## 11. PT-096 — Sin JavaScript en las plantillas, sin `unsafe-inline`

**Qué se afirma, y es lo más importante de validar**: 24 manejadores inline estaban **muertos**, y
entre ellos las confirmaciones antes de acciones destructivas.

**La prueba que importa**, en el panel de administración:

```
Entra a una subasta y pulsa «Forzar cierre» o «Cancelar».
```

**Qué deberías ver**: **aparece una confirmación**, y si dices que no, **no pasa nada**.
Antes de PT-096, la acción se ejecutaba directamente.

Prueba también:
- **Ordenar el catálogo** en `base.ironloot.local/auctions` — antes no hacía nada.
- **Filtrar por estado** en el listado de subastas del admin.

Comprobación técnica:

```bash
for h in base client admin; do
  curl -s -D - -o /dev/null -H "Host: $h.ironloot.local" http://localhost/ | grep -io "script-src [^;]*"
done
```

**Qué deberías ver**: `script-src 'self'` (más el CDN donde toque), **sin `'unsafe-inline'`**.

---

## 12. PT-101 — ADMIN y BASE tienen dónde probar

```bash
cd src/admin && npm test        # 13
cd ../apps/base && npm test     # 3
```

**Lo que este PT encontró el primer día**: el guardia del panel usaba comprobación de veracidad, de
modo que `isAdmin: 'false'` —la **cadena**— lo abría. Corregido.

**Se valida si**: los 13 pasan **y** el login del panel sigue funcionando (ya lo probaste en el
punto 10).

---

## Cómo registrar tu decisión

Para cada PT, una de tres:

| Decisión | Qué hacer |
|---|---|
| **Validado** | Anótalo en `HISTORY.log` con una entrada `## PT-XXX — VALIDACION` y `Status: CLOSED (validado por humano)` |
| **Con reservas** | Valídalo y abre un hallazgo nuevo con lo que te chirríe |
| **No validado** | Dilo con lo que viste. El PT vuelve a `IN_PROGRESS` |

El precedente está en `HISTORY.log`: busca `PT-078 / PT-079 / PT-080 — VALIDACION`.

---

## Lo que NO puedes validar, y por qué

Se declara para que no lo busques:

| Cosa | Motivo |
|---|---|
| El webhook de PayPal con **firma válida** | Requiere que PayPal alcance la API; no hay URL pública. Sí está probado el rechazo (401) |
| **Stripe y HeyBanco** | Sin credenciales |
| **CFDI** | Exige contratar un PAC ante el SAT |
| **Depositar a una tarjeta** | Exige un producto de dispersión que el SDK de Mercado Pago no expone |
| El **micro-depósito real a una CLABE** | La dispersión es manual: la envía un administrador |
| **HTTPS** | Soportado por configuración (`PUBLIC_SCHEME=https`), sin certificados ni `listen 443` |

---

## Antes de empujar a producción

1. **`ADMIN_TOTP_SECRET`** — sin él, la API **no arranca** en producción. Es intencionado (PT-093).
2. **`PUBLIC_SCHEME=https` y `PUBLIC_DOMAIN=ironloot.com`** — de ahí se derivan todas las URLs.
3. **El webhook de PayPal** apunta hoy a una URL de marcador. Actualízalo cuando exista la pública.
4. **`Payment.reference` es ahora única.** Una base con datos previos puede tener duplicados, y el
   índice no se crea hasta deduplicar. El SQL está en `Modelo-de-Datos.md`, migración 25.
5. **Los vendedores existentes** deberán verificar su cuenta antes de su próximo retiro (PT-092).
   No se les concedió verificación retroactiva: eso habría anulado el PT en el mismo commit.

---

## 13. Resultado de la ejecución automatizada (27-jul-2026)

La guía se ejecutó entera contra el entorno real: navegador Chromium controlado, contenedores
Docker, base de datos en vivo y las suites `npm test` de los cinco proyectos. Lo que sigue es lo
que se observó, no lo que se esperaba observar.

### 13.1 Cuadro de mando

| # | PT | Veredicto | Evidencia observada |
|:--|:--|:--|:--|
| 1 | **PT-090** | ⚠️ **NO VALIDABLE** | **F-33** — el registro vuelve a contradecir al código |
| 2 | **PT-098** | ⚠️ **NO DEMOSTRABLE** | Su arreglo es correcto, pero **F-34 lo tapa**: si sigues §2 no verás cambiar el precio |
| 3 | PT-091 | ✅ Listo | 0 errores en los cinco proyectos (802/552/39/55/1 avisos) |
| 4 | PT-092 | ✅ Listo | 9/9: retiro bloqueado sin verificar → token → verificado → retiro HTTP 201 |
| 5 | PT-099 | ✅ Listo | `npm test` de raíz recorre los cinco proyectos |
| 6 | PT-093 | ✅ Listo | 12/12 en `validate-startup-config` |
| 7 | PT-094 | ✅ Listo | `docker restart ironloot-admin` → HTTP 200, `Up (healthy)` |
| 8 | PT-095 | ✅ Listo | Dominio inexistente → aviso con las líneas de `hosts` listas para copiar |
| 9 | PT-097 | ✅ Listo | **168/168 PASS, 0 FALLO** en la suite completa |
| 10 | PT-100 | ✅ Listo | Sesión de ADMIN persiste entre secciones del subdominio |
| 11 | **PT-096** | ⚠️ **NO VALIDABLE** | **F-34** — apagó la puja en vivo (regresión sobre PT-098) |
| 12 | PT-101 | ✅ Listo | 13 (ADMIN) + 3 (BASE) PASS |
| — | *Suites unitarias* | ✅ | **691/691**: 458 API + 83 CLIENT + 134 CORE + 13 ADMIN + 3 BASE |

**Diez de trece listos para tu validación. Tres, no.**

> **Sobre PT-098.** Su corrección —la URL relativa en vez de `http://api:3000`— está en el código y
> es la correcta; se lee en `pages-auction-detail.js:34`. Pero **no puedes comprobarla siguiendo la
> §2**, porque F-34 impide que ese código llegue a ejecutarse. Marcarlo «listo» te habría mandado a
> una prueba que falla por causa ajena. Queda a la espera de F-34; en cuanto se arregle, se valida
> con la misma §2 sin tocar nada más.

### 13.2 Detalle de lo ejecutado

**Suite de navegador completa** (`bash run-all.sh`) — 168 casos, ninguno rojo:

| Fase | PASS | Fase | PASS |
|:--|--:|:--|--:|
| `smoke` | 57 | `payment-trace` | 16 |
| `authed` | 41 | `bootstrap` | 13 |
| `extras` | 19 | `withdrawal` | 13 |
| `e2e` | 5 | `admin-writes` | 4 |

> `31-outbid.cjs` no aparece: está excluido de la secuencia **a propósito** desde PT-074 —necesita
> una subasta fresca— y su caso lo cubre `E2E-6` dentro de la fase `e2e`. No es una omisión.

**Navegador dirigido** (7/7) — ordenar el catálogo funciona, el script delegado se carga, la
confirmación «¿Forzar cierre?» salta y **cancela de verdad** (`defaultPrevented=true`), el filtro
se auto-envía, se navega entre secciones sin rebotar al login, **cero violaciones de CSP**.

**Verificación de cuenta** (9/9) — el token generado fue `B9RRPC`: seis caracteres, sin `0/O` ni
`1/I/L`, **transcribible por teléfono**. Se verificó **escribiéndolo en minúsculas**, como haría
cualquiera. Un token erróneo dejó «4 intentos». El segundo PayPal se rechazó **nombrando** el que
ya existía. Y el token **no viajó en ninguna respuesta de la API**, que era la condición dura.

**PT-095** — se forzó un dominio que no resuelve. El aviso no dice «algo va mal»: dice qué pasará
(«iniciarás sesión en BASE y CLIENT te tratará como anónimo»), por qué, y suelta las cinco líneas
de `hosts` con la ruta del fichero en Windows y en Linux/macOS. En producción no se emite.

### 13.3 Hallazgo F-33 — El registro de deuda técnica volvió a mentir

**Dimensión**: D4 (fidelidad documental) · **Severidad**: ALTA · **Tipo**: BUG · **Autor: yo**

`10-Technical-Debt.md` marca como `Open` cuatro deudas que **están cerradas en el código**:

| Deuda | Estado en el registro | Realidad |
|:--|:--|:--|
| TD-003 | `Open` | Cerrada por **PT-092** (verificación de cuenta) |
| TD-005 | `Open` | Cerrada por **PT-096** |
| TD-010 | `Open` | Cerrada por **PT-096** |
| TD-012 | `Open` | Cerrada por **PT-091** |

Lo que duele: **PT-090 existía exactamente para arreglar esto** —que el registro contradijera al
código— y lo reintroduje yo al cerrar las deudas siguientes sin volver al registro. El PT no puede
validarse mientras su propio defecto esté presente en el fichero que vino a corregir.

**Por qué pasó**: cerrar una deuda toca dos sitios —el código y el registro— y nada obliga a lo
segundo. Es la misma clase de fallo que PT-090 diagnosticó; sólo cambió quién lo cometió.

**Qué exige**: además de corregir las cuatro filas, una prueba que falle cuando un `TD-XXX` citado
como cerrado en `HISTORY.log` siga `Open` en el registro. Sin eso, volverá a pasar una tercera vez.

### 13.4 Hallazgo F-34 — PT-096 apagó la puja en vivo (regresión sobre PT-098)

**Dimensión**: D1 (dominio) · **Severidad**: CRÍTICA · **Tipo**: BUG · **Autor: yo**

En una plataforma de subastas, ver subir el precio **sin recargar** no es un adorno: es el
producto. Está apagado en `client.ironloot.local`.

**Qué se observó.** Dos navegadores sobre la misma subasta. La página carga, `io` existe, el
formulario está — pero el navegador **nunca abre el socket**: el único tráfico hacia `socket.io`
es la descarga del script del CDN. Una sonda manual lanzada en esa misma página **sí conecta**, y
por `websocket`:

```
--- tráfico socket.io ---
  REQ  https://cdn.socket.io/4.7.5/socket.io.min.js     <- sólo esto
--- sonda manual en la misma página ---
  {"conectado":true,"transporte":"websocket","id":"CRCE8wKqCYiOfyrRAAAD"}
```

Es decir: **la infraestructura funciona** —nginx negocia el *upgrade*, el API responde el
handshake (HTTP 200 por nginx y directo)—. Lo que no se ejecuta es el código de la página.

**Causa raíz.** El orden de los `<script>`, medido en el navegador:

```
  1. pages-auction-detail.js      <- llama a io(...)
  2. socket.io (CDN)              <- define io
```

`pages-auction-detail.js` llama a `io('/auctions', …)` cuando `io` **todavía no existe**. Lanza
`ReferenceError`… y lo recoge el `try/catch` que envuelve el bloque con el comentario *«live feed
is optional; the page still works without it»*. La página funciona. La puja en vivo, no. Y no hay
ni un error en consola.

**Introducido por**: `b4e7261 refactor: PT-096 …`. Antes de ese commit el orden era el correcto:

```
  46. <script src="https://cdn.socket.io/4.7.5/socket.io.min.js" …>   <- primero
  49. <script>  … código de la puja …  </script>                      <- después
```

Al sacar el JavaScript inline a un fichero, coloqué el `<script src>` **delante** del CDN e
invertí una dependencia que el orden original respetaba. PT-096 se commiteó con el lema de que se
movía «TAL CUAL»; el contenido sí, la posición no.

**Por qué no lo cazó nada**:
1. El `try/catch` convierte el fallo en silencio — ni consola, ni test, ni usuario avisado.
2. La suite prueba la puja por **HTTP** (`E2E-5`/`E2E-6`), que sigue funcionando. Nadie comprobaba
   que el otro navegador **se enterase**. La cobertura tapaba justo el hueco por el que se coló.
3. `plantillas-sin-js-inline.spec.ts` (PT-096) vigila que no haya JS inline. Del **orden** de los
   scripts no dice nada.

**Qué exige**:
- Poner el CDN antes del script de la página (o `defer` en ambos, que además respeta el orden).
- Que el fallo **deje de ser silencioso**: si `io` no está, registrarlo — un `catch` vacío sobre
  una función del producto es la razón de que esto viviera semanas sin verse.
- Una prueba de **dos navegadores** que falle si el precio no propaga. Es el hueco de cobertura,
  y sin cerrarlo la regresión puede repetirse mañana.

> **Nota sobre estos hallazgos.** Los dos son míos y los dos son de la misma familia: cerrar por
> un lado y romper por otro sin que nada avise. F-33 lo hizo con la documentación; F-34, con una
> función que un usuario habría notado antes que yo.

### 13.5 Lo que no se pudo probar en esta corrida

| Cosa | Motivo |
|:--|:--|
| Propagación en vivo entre dos navegadores | **Bloqueada por F-34**. La infraestructura se verificó por separado: nginx hace *upgrade*, el API responde, y una sonda conecta por `websocket` |
| Segunda puja del comprador2 en la subasta de la corrida | Ya era el mejor postor con $700; pujar contra uno mismo se rechaza **correctamente** (HTTP 400). Artefacto del guion, no defecto |

### 13.6 Qué toca ahora

| PT | Acción |
|:--|:--|
| PT-091 · 092 · 093 · 094 · 095 · 097 · 099 · 100 · 101 | **Listos para tu validación**. Anótalos en `HISTORY.log` según §«Cómo registrar tu decisión» |
| **PT-090** | No validar. Depende de **F-33** |
| **PT-096** | No validar. Depende de **F-34** |
| **PT-098** | No validar todavía. Su código es correcto, pero **F-34** impide demostrarlo |

**F-33 y F-34 entran en la matriz y abren su propio ciclo FDGE** (STATE 1-B, ambos BUG). Ninguno
se toca sin tu ACK: FDGE prohíbe diseñar solución antes de que valides el diagnóstico, y F-34 en
particular ya demostró lo que cuesta cambiar código «obvio» sin medir después.

---

## 14. Cierre de los hallazgos (27-jul-2026)

Los dos defectos que la §13 encontró pasaron su ciclo FDGE completo. Con ellos salió un tercero.
Los tres están fusionados a `master`.

### 14.1 Qué se hizo

| PT | Hallazgo | Qué se arregló | Qué impide que vuelva |
|:--|:--|:--|:--|
| **PT-102** | F-34 (D1, CRÍTICA) | El CDN va primero y ambos `<script>` llevan `defer`; el `catch` deja de ser mudo | `orden-de-scripts.spec.ts` + fase 32 de la suite, dos navegadores reales |
| **PT-103** | F-33 (D4, ALTA) | Cuatro filas del registro, comprobadas **contra el código** | `coherencia-deuda-tecnica.spec.ts` cruza `HISTORY.log` con el registro |
| **PT-104** | F-35 (D5, BAJA) | El crédito se mide por `reference`, no restando saldos | La medición nueva detecta además asiento duplicado y monedero equivocado |

### 14.2 El estado ahora

```
npm test                193 + 703 = todo verde
  API 464 · CLIENT 89 · CORE 134 · ADMIN 13 · BASE 3      703/703

bash run-all.sh                                           193/193
  smoke 57 · authed 41 · extras 19 · paypal 17 · trace 16
  bootstrap 13 · withdrawal 13 · puja-en-vivo 8 · e2e 5 · admin 4
```

De 691 a 703 tests, y de 168 a **193** casos de navegador. Los 25 nuevos no son relleno: 8 son la
puja en vivo que nadie comprobaba, 12 son comprobaciones de traza que **nunca llegaban a
ejecutarse**, y el resto son las guardas que impiden que los tres defectos vuelvan.

### 14.3 Lo que apareció al verificar, y no estaba planeado

Los tres ciclos produjeron hallazgos que sólo salen comprobando de verdad:

| De dónde | Qué |
|:--|:--|
| PT-103 | **TD-005 no estaba del todo cerrada.** PT-096 limpió `script-src` —su objetivo y el riesgo grande— pero `style-src` conserva `'unsafe-inline'`. Se cierra **acotada** y el resto se registra como **TD-014**, en vez de esconderlo tras un cierre a secas |
| PT-103 | **`PENDING_TASKS.md`** llevaba nueve trabajos como `PENDING` que estaban hechos. El desfase de F-33 en otro fichero |
| PT-104 | **La fase 70 trataba `/v1/orders` como síncrona.** Cuando Mercado Pago respondía `processing` —orden en curso, no fallida— la fase se rendía. Doce comprobaciones de traza no corrían nunca; el pago sí se cobraba. Ahora: 4 casos → 16 |

### 14.4 Dos reglas nuevas

Ninguna se inventó: las dos salen de un defecto que ya ocurrió.

**RULE-07** (de F-34) — Una dependencia entre scripts se declara con `defer` y orden, no se hereda
de la posición en el fichero. Y un `try/catch` sobre una función del producto **registra algo**: un
fallo que nadie puede observar no es un fallo tolerado, es un fallo oculto.

**RULE-08** (de F-33) — Cerrar una deuda son **dos** escrituras, y el estado nuevo **cita qué leer**
para comprobarlo. «Cerrada por PT-XXX» sin cita es otra afirmación sin respaldo.

### 14.5 Qué toca ahora

**Los quince PT están listos para tu validación**: `PT-090` … `PT-104`. Las tres secciones que
estaban bloqueadas —§1 (PT-090), §2 (PT-098) y §11 (PT-096)— vuelven a valer tal cual están
escritas.

Para la §2, si prefieres no montar dos navegadores a mano:

```bash
node tests/qa-browser-suite/32-puja-en-vivo.cjs
```

**Nada queda pendiente de implementar.** Lo único abierto es **TD-014** (`style-src
'unsafe-inline'`), registrada hoy y sin urgencia: `script-src` ya impide ejecutar nada.

---

## 15. Validación ejecutada de los quince PT (27-jul-2026)

Se ejecutó cada comprobación de esta guía contra el entorno real. Abajo, **qué se corrió y qué
devolvió** — no «se validó», sino la salida.

Evidencia completa en `docs/implementation/evidence/VALIDACION-FINAL/`.

### 15.1 Los quince, uno por uno

| PT | Qué se ejecutó | Resultado observado |
|:--|:--|:--|
| **PT-090** | Las citas del registro resuelven a código | `account-verification.service.ts` existe · `withdrawals.service.ts:50` contiene el rechazo textual |
| **PT-091** | `npm run lint:check` | **0 errores** en los cinco (802/552/39/55/1 avisos) |
| **PT-092** | Camino completo de verificación de cuenta | **9/9** — retiro bloqueado → token `C9ECJR` → verificado en minúsculas → retiro `201` |
| **PT-093** | `validate-startup-config` | **12/12** — falla sin TOTP en producción, no lo exige en desarrollo |
| **PT-094** | `docker restart ironloot-admin` | **HTTP 200**, `Up 50 seconds (healthy)` |
| **PT-095** | Dominio que no resuelve | Aviso con la consecuencia («te tratará como anónimo») y las cinco líneas de `hosts`. En producción no se emite |
| **PT-096** | Navegador + guarda estática | **7/7** en navegador · **12/12** plantillas · confirmación `"¿Forzar cierre?"` **cancela de verdad** · **0 violaciones de CSP** |
| **PT-097** | `bash run-all.sh` completa | **193/193**, desde base vacía |
| **PT-098** | Fase 32, dos navegadores | **8/8** — el precio sube en el segundo navegador **sin recargar** |
| **PT-099** | `npm test` de la raíz | **5** bloques de suites (antes 1) |
| **PT-100** | Sesión de ADMIN en el subdominio | Entra y **navega entre secciones sin rebotar** al login |
| **PT-101** | Suites de ADMIN y BASE | **13 + 3** |
| **PT-102** | `orden-de-scripts` + fase 32 | **6/6** (con los dos casos de control) · puja en vivo **8/8** |
| **PT-103** | `coherencia-deuda-tecnica` | **6/6** — el registro ya no contradice a la historia |
| **PT-104** | Fases 70 y 71, pasarelas reales | **16/16** y **17/17** |

### 15.2 El conjunto

```
npm test          703/703    API 464 · CLIENT 89 · CORE 134 · ADMIN 13 · BASE 3
lint:check        0 errores en los cinco proyectos
bash run-all.sh   193/193    diez fases, dos pasarelas reales de punta a punta
```

### 15.3 Lo que esto no es

**No es el cierre de los quince.** FDGE dice que el agente no cierra bugs, y no lo hago: lo que hay
arriba es la evidencia, ejecutada y reproducible. Los quince siguen en `VALIDATION_PENDING`.

Para cerrarlos basta tu palabra. Si estás conforme, se anota en `HISTORY.log` una entrada por PT
con `Status: CLOSED (validado por humano)` — el precedente está en las entradas
`PT-078 / PT-079 / PT-080 — VALIDACION`.

Si algo de lo de arriba no te cuadra, ese PT vuelve a `IN_PROGRESS` y se abre su ciclo. Eso también
es un resultado válido.

### 15.4 Lo que sigue sin poder comprobarse

Sin cambios respecto a la §«Lo que NO puedes validar»: el webhook de PayPal con firma válida
(no hay URL pública), Stripe y HeyBanco (sin credenciales), CFDI (exige contratar un PAC), el
depósito a tarjeta (exige dispersión), el micro-depósito real a una CLABE (lo envía un
administrador a mano) y HTTPS (soportado por configuración, sin certificados).

Y una limitación nueva, de hoy: **la suite de QA no entra en el grafo de graphify** — sus ficheros
son `.cjs` y el extractor no cubre esa extensión. No afecta al producto; afecta a lo que el grafo
puede responder sobre las pruebas.

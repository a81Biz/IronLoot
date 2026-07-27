# HANDOFF — estado actual

**Fecha**: 2026-07-27
**Rama**: `master` — `0069114` = `origin/master`, árbol limpio, cero ramas sin fusionar.

**Pruebas**: **720/720** unitarias (API 467 · CLIENT 103 · CORE 134 · ADMIN 13 · BASE 3) ·
suite de navegador **193/193** · `lint` 0 errores en los cinco proyectos.

---

## Lo último: limpieza de TD-014 y los dos defectos menores

| PT | Qué era | Estado |
|---|---|---|
| **PT-105** | **TD-014** — 93 atributos `style=` obligaban a `unsafe-inline` en `style-src` | Cerrado. **La CSP ya no lleva `unsafe-inline` en ninguna directiva** |
| **PT-106** | 16 de 20 capturas caían en `<etiqueta>/undefined.png` **dentro del código fuente** | Cerrado. Van a `qa-out/<corrida>/capturas/` con su nombre |
| **PT-107** | La suite de QA tenía **0 nodos** en graphify (`.cjs` no indexado) | Cerrado. **387 nodos** |
| **PT-108** | **F-36** — `docker restart` dejaba BASE en 503 | Cerrado. TD-013 estaba cerrada solo en ADMIN |

**Lo que apareció al hacerlo:**

- **El riesgo de PT-105 era real**: cuatro páginas de pestañas de ADMIN hacían
  `style.display = ''` —«vuelve a lo que diga el CSS»—, y al pasar el ocultamiento a una clase «lo
  que diga el CSS» pasó a ser *oculto*. Se pasaron a `classList`.
- **PT-106 no era cosmético**: las capturas eran inservibles para diagnosticar, se pisaban entre
  corridas y ensuciaban el repositorio. Mi propio PT-102 había copiado el patrón malo.
- **PT-107 rompió la guarda que PT-106 acababa de escribir** (apuntaba a `lib.cjs`). Lo cazó
  `npm test`, que es para lo que sirve.
- **F-36 es la tercera vez esta semana del mismo patrón**: *arreglar donde se observó y no donde
  vive*. Antes fueron F-33 y TD-005 partida en dos.

**RULE-09** (de TD-014): los estilos viven en el CSS; para mostrar/ocultar, `classList`, nunca
`style.display = ''`.

## Pendiente de validación humana

**Uno**: `PT-109` (documentación al día). Los diecinueve anteriores (PT-090…PT-108) están
**CLOSED (validados por humano)**.

## Documentación

Al día a **2026-07-27** (PT-109). Se corrigieron, con cita, las afirmaciones que habían dejado de
ser ciertas —la CSP «necesita `unsafe-inline`», el TOTP «opcional», «Frontends: 0 tests»— y se
añadió lo que faltaba: 5 servicios y 7 endpoints en el inventario.

**Graphify regenerado**: 2442 nodos, 5100 aristas, 178 comunidades; la suite de QA aporta 198
nodos (tenía 0). La capa semántica del 26-jun se **fusiona**, no se reemplaza: rehacerla costaría
5.5M de palabras y sólo ha cambiado código.

> ⚠️ **`docs/enterprise-documentation/` es un recorrido del 23-jun con parches encima, no una
> regeneración.** Foundation Protocol dice que una nueva ejecución sobrescribe todo. Han entrado
> 20 PT que tocaron CSP, pagos, retiros y pruebas. Regenerar es decisión tuya.

## Pendiente de implementar

**Nada.** Ninguna deuda técnica queda abierta salvo las bloqueadas por terceros.

## Bloqueado por dependencia externa

`TD-001` (CFDI: contratar un PAC ante el SAT) · `TD-002` (Stripe/HeyBanco: sin credenciales) ·
`F-27` (dispersión a tarjeta: el SDK de Mercado Pago no expone *payout*) · `TD-009` (riesgo
aceptado; lo que protege es la deduplicación, y está).

---

## Riesgos vivos

1. **PTSA está desactualizado.** Última auditoría el 23-jun (Health 95.2, Clase A), cinco semanas y
   ~19 PT atrás. Por su propia regla de frescura ese score ya está STALE, lo que capa la
   clasificación en C hasta resincronizar. **Es lo siguiente que más cambia lo que sabemos.**
2. **El ROADMAP de FPGE está agotado**: emisión del 23-jun, sus items o hechos o bloqueados.
3. **La guarda de coherencia documental no corre en CI**: `docs/` está gitignored y el test se
   salta si los ficheros no están. Protege a quien tiene los documentos.
4. **CLIENT arranca distinto a los otros dos** (`nest build && nest start --watch`). No está roto
   —esa compilación previa es justo lo que lo salva de F-36— pero es una tercera forma de arrancar
   tres cosas iguales.

## Antes de producción

1. **`ADMIN_TOTP_SECRET`** — sin él la API **no arranca** en producción. Es intencionado (PT-093).
2. **`PUBLIC_SCHEME=https` y `PUBLIC_DOMAIN=ironloot.com`** — de ahí se derivan todas las URLs.
3. **El webhook de PayPal** (`79912641J8336873F`) apunta a una URL de marcador.
4. **`Payment.reference` es única.** Una BD con datos previos puede tener duplicados y el índice no
   se crea hasta deduplicar. SQL en `Modelo-de-Datos.md`, migración 25.
5. **Los vendedores existentes** deberán verificar su cuenta antes del próximo retiro (PT-092).

---

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
- **El `.gitignore` tiene un `*.js` global** pensado para la salida de TypeScript, que se llevaba
  por delante todo el JavaScript del navegador. Hay excepción para `public/js/`, pero conviene
  comprobar que un script de front nuevo llega de verdad al repositorio.
- El checkout de **Mercado Pago no se puede automatizar** sin credenciales de un comprador de
  prueba: se crea el cobro con la Orders API, que es el mismo pago real.
- El registro por API exige **verificar el correo**; el gate es `state`, no `email_verified_at`:
  tocar la fecha a mano no sirve, hay que llamar a `/auth/verify-email`.
- BD en **localhost:5433**, no 5432.
- El entrypoint hace `prisma db push --accept-data-loss` en cada arranque: no hay
  `_prisma_migrations` en desarrollo (ADR-006 / AUD-001). Generar el SQL con `migrate diff`,
  comprobar que es aditivo y aplicarlo con `psql`.
- Los `Decimal` de Prisma **no son serializables a JSONB**.
- `UnauthorizedException` del proyecto (`common/observability`) **no es** la de `@nestjs/common`: un
  test que importe la de Nest falla con «Expected UnauthorizedException, received
  UnauthorizedException».
- Commits con heredoc, no here-strings de PowerShell. Y un heredoc de shell con comillas dentro del
  texto se atraganta: para documentos largos, escribir el fichero y concatenar.
- `docs/`, `changes/`, `CLAUDE.md` y `tests/qa-browser-suite/paypal-sandbox.json` están
  **gitignored**.
- **`bash run-all.sh` trunca 32 tablas de la BD.** Es destructivo por diseño; no lanzarlo sobre
  datos que importen.

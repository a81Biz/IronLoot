# Evidencia — PT-088

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-087-garantias-por-proveedor`

## El fallo, y por qué era cuatro fallos

El síntoma: PayPal devolvía a `client.localhost` y nginx no resolvía. Debajo había una cadena:

| # | Defecto | Verificado |
|---|---|---|
| F-15 | nginx publicaba en **8080**, no en 80 | `NGINX_HTTP_PORT=8080`; el 80 estaba libre |
| F-16 | **Ninguna ruta de retorno existía** en CLIENT | `/wallet/success`, `/wallet/deposit-success`… ausentes; el pago acababa en 404 tras cobrar |
| F-17 | Cada adaptador se inventaba su URL | tres valores por defecto (`5173`, `5175`, otro en Stripe) y una ruta distinta por pasarela |
| F-18 | `docker-compose.override.yml` forzaba `localhost:<puerto>` y vaciaba `COOKIE_DOMAIN` | era un apaño creado *«porque el 80 está ocupado por otro proyecto»* |

**El más caro es F-18**, y explica por qué el problema aparece justo ahora: con
`localhost:5174` y `localhost:5175` la cookie se comparte —el puerto **no** delimita cookies— así
que la sesión cruzaba de BASE a CLIENT por accidente. Al pasar a subdominios eso deja de ser
cierto y hace falta `Domain=`, que estaba vacío.

`.localhost` **no sirve** como dominio de cookie: los navegadores lo rechazan por ser dominio de
uso especial. Esto ya estaba escrito en `.env.example` («*.localhost does NOT work — Chrome/Edge
reject cookies for public suffixes*»); lo que había derivado era el `.env` local. De ahí que el
dominio de desarrollo sea `ironloot.local`, que es además la forma de producción.

## La corrección

Una sola fuente en el `.env` raíz:

```
PUBLIC_SCHEME=http           # produccion: https
PUBLIC_DOMAIN=ironloot.local # produccion: ironloot.com
COOKIE_DOMAIN=.ironloot.local
NGINX_HTTP_PORT=80
```

`docker-compose` **deriva** de ahí `BASE_URL`, `CLIENT_URL` y `COOKIE_DOMAIN` para los cuatro
servicios. Los adaptadores no construyen URLs: llaman a `depositReturnUrl()`, que da una **ruta
canónica única** (`/wallet/deposit/return?ref=…&status=…`) para todas las pasarelas.

Cambiar de entorno es cambiar dos variables.

## Demostración en navegador

Un solo recorrido, sin puertos en ninguna URL:

```
login  → http://client.ironloot.local/dashboard        (sesion cruzando subdominios)
cookies: access_token@.ironloot.local, refresh_token@.ironloot.local

PayPal checkout → https://www.sandbox.paypal.com/checkoutnow?token=7BM09002CG135102W
PayPal retorno  → http://client.ironloot.local/wallet/deposit/return?ref=DEP-...888&status=success
                  «Tu pago está en proceso — 275.4 MXN»
                  (el cron acredita)          → «Depósito acreditado — 275.4 MXN … con PayPal»

MP checkout → https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=1447980859
cobro real  → ORDTST01KYGSJF5E0SCV021RPQZGTFD3  processed
MP retorno  → http://client.ironloot.local/wallet/deposit/return?ref=DEP-...698&status=success
              «Depósito acreditado — 189.9 MXN … con MercadoPago»

wallet final: MXN 465.30   ( = 275.40 + 189.90 )
```

**Alcance honesto de la parte de Mercado Pago**: el checkout de MP exige credenciales de un
comprador de prueba que no tenemos, así que **ese paso no se pulsó en el navegador**: el cobro se
creó con la Orders API y tarjeta de prueba, que es el mismo pago real. Lo demostrado en el
navegador para MP es la redirección al checkout, el retorno y la acreditación. El recorrido de
PayPal **sí es completo de punta a punta**, incluido el clic de aprobación del comprador.

## Suites

API **59 suites / 390 tests** ✅ · `typecheck` ✅ · `lint` 0 errores ✅.
Tests nuevos: 8 (URLs de retorno) + 7 (estado del depósito).

## Un test que decía lo contrario

`T-17` exigía que las URLs de PayPal contuvieran `5175`. Fijaba en piedra justo lo que estaba
mal: una URL con puerto no sirve en producción, y la ruta a la que apuntaba no existía. Ahora
exige subdominio, ruta canónica y ausencia de puerto.

# design — PT-088: las URLs de retorno llevan al monedero

**PT-088** | 2026-07-27 | BUG (F-15..F-18) | STANDARD | Rama usada: `fix/PT-087-garantias-por-proveedor`
**Entrada**: `DISCOVERY.md` § PT-088

> ⚠️ **Paquete retroactivo.** Se redactó después de implementar y verificar, no antes.
> Se anota además que **no se abrió rama propia**: PT-088 se implementó sobre la de PT-087, lo
> que mezcla dos PT en una rama y le quita al desarrollador la opción de aceptar uno y no el otro.

## Decisión de fondo

El encargo era «corregir nginx». nginx no estaba mal: su bloque de `client.localhost` era correcto
desde el principio. La decisión fue **no parchear el síntoma** —subir nginx al 80 y crear las
rutas que faltaban— sino atacar la causa: **no había una fuente de verdad para el dominio
público**.

## AD-01 — El dominio público es UNA variable, y las URLs se derivan

`CLIENT_URL` vivía en tres sitios con dos valores distintos (`client.localhost` en `src/api/.env`,
`client.ironloot.local` incrustado en `docker-compose.yml`), y cada adaptador de pago tenía además
su propio valor por defecto. Ahora:

```
PUBLIC_SCHEME=http            # producción: https
PUBLIC_DOMAIN=ironloot.local  # producción: ironloot.com
```

`docker-compose` deriva `BASE_URL`, `CLIENT_URL` y `COOKIE_DOMAIN` para los cuatro servicios.
**Cambiar de entorno es cambiar dos líneas**, no perseguir URLs por el árbol.

## AD-02 — Una sola ruta de retorno, con el estado como parámetro

Cuatro pasarelas apuntaban a cuatro rutas distintas y **ninguna existía**. Ahora hay una:
`/wallet/deposit/return?ref=…&status=…`.

Alternativa descartada: una ruta por estado (`/success`, `/failure`, `/pending`). Mercado Pago
necesita tres URLs distintas y PayPal dos, pero eso es una necesidad **de la pasarela**, no del
producto: se resuelve con un parámetro y una sola página que mantener.

## AD-03 — El `status` de la URL no decide nada

Lo escribe el navegador: cualquiera puede cambiar `failure` por `success`. La página lo usa para
el primer pintado y pide la verdad a `GET /payments/status/:reference`.

Ese endpoint responde **solo al dueño**, y un depósito ajeno se responde **como inexistente**:
distinguir «no existe» de «no es tuyo» confirmaría que existe, y las referencias llevan dentro el
id del usuario.

## AD-04 — Un ciclo abierto es «pendiente», jamás «fallido»

Efectivo y SPEI tardan horas. Decirle «falló» a quien acaba de pagar en un OXXO sería mentirle, y
el resultado previsible es **un segundo pago**. La página se refresca sola mientras espera, para
que el usuario vea la acreditación sin recargar ni volver a pagar.

## AD-05 — `ironloot.local` en desarrollo, no `localhost`

Los navegadores **rechazan** `Domain=.localhost` (dominio de uso especial, RFC 6265). Con
`localhost:<puerto>` no se nota porque el puerto no delimita cookies: la sesión se compartía por
accidente. `ironloot.local` reproduce además la forma de producción. Exige entradas en el fichero
hosts, ya documentadas y presentes.

## AD-06 — El override local se vacía, con su explicación

`docker-compose.override.yml` devolvía todo a `localhost:<puerto>`. Se deja el fichero con el
motivo por el que no debe volver, y la salida correcta si el 80 se ocupa:
`NGINX_HTTP_PORT=8081` + `PUBLIC_DOMAIN=ironloot.local:8081`, **conservando los subdominios**.

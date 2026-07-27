# REFACTOR_SCOPE — PT-126: NestJS 10->11 y Express 4->5

**Fecha**: 2026-07-27 · **Complejidad**: **MAJOR** · **Variante**: STATE 1-R
**Origen**: TD-015 / H-008. Es la tercera y ultima de las decisiones de plataforma que identifico
PT-123 — la que cierra 7 de los 10 avisos restantes.
**Autorizacion**: explicita del humano el 2026-07-27: *«si la migracion es lo que se necesita para
mejorar la seguridad, trazabilidad o cualquiera que sea medible necesitamos hacerla aunque tome mas
esfuerzo, mejor ahora que parchar»*. Y: *«no estamos en produccion»*.

## Que cambia

`@nestjs/*` 10 -> 11 en los **cuatro servicios NestJS** (API, BASE, CLIENT, ADMIN). Arrastra
`@nestjs/platform-express` -> Express 5, y con el `path-to-regexp` 3 -> 8 y `body-parser` 1 -> 2.

Avisos que cierra en el API: `@nestjs/core`, `path-to-regexp`, `body-parser`, `multer`, `js-yaml`
(via swagger), `glob`/`minimatch`/`brace-expansion` (via la cadena que sube con el resto).

Se incluyen BASE, CLIENT y ADMIN aunque TD-015 solo media el API: los tres tienen sus propios
avisos (9, 9 y 8) y quedarse a medias significa mantener dos versiones del mismo framework en el
mismo repositorio. Eso es la definicion del parche que el humano pidio dejar de hacer.

## Que NO cambia

- **Ninguna ruta.** Los `:id` no cambian de sintaxis entre path-to-regexp 3 y 8.
- **Ningun dato.** No hay migracion de BD en este PT.
- **El comportamiento observable de la API.** Mismo contrato, mismos estados, mismos cuerpos.
- `@nestjs/schedule` (6.x) y `@nestjs/bullmq` (11.x) ya estan por delante; se ajustan si el pico
  de dependencias lo exige, no por gusto.

## EL riesgo, y es uno concreto

`app.module.ts:167` -> `consumer.apply(ContextMiddleware).forRoutes('*')`.

**`'*'` no es una ruta valida en path-to-regexp 8.** O lanza al arrancar, o —peor— deja de casar en
silencio. `ContextMiddleware` es quien pone el `traceId`: sin el, cada peticion pierde el hilo que
une su log, su fila en `error_events` y su apunte en la traza de pagos.

Esto es exactamente F-34 otra vez: **algo que se apaga sin que nadie lo note y con la suite en
verde**. La suite no lo cazaria porque ningun test unitario monta el middleware.

Por eso la barra de calidad de este PT no es «compila y pasan los tests».

## Quality bar — como se sabe que esta completo

1. Los cuatro servicios **arrancan** y responden.
2. `npm audit --omit=dev` en el API baja de 10 paquetes a **3 o menos**.
3. Las 561 pruebas del API + las de CLIENT/CORE/ADMIN/BASE siguen pasando.
4. **Una peticion real devuelve `traceId`** y deja fila en `request_logs`. Sin esto, el PT no esta
   hecho aunque todo lo demas este verde.
5. Un flujo de dinero de punta a punta: login -> ver saldo -> pedir deposito. Es lo que mas capas
   atraviesa (guardas, validacion, BD, adaptador de pasarela).
6. El WebSocket de puja sigue conectando (`platform-socket.io` sube con el resto).

## Riesgo de regresion — que debe conservarse exacto

| Riesgo | Por que importa | Como se comprueba |
|---|---|---|
| **`forRoutes('*')` deja de casar** | Muere la trazabilidad, en silencio | Peticion real: `traceId` en la respuesta + fila en `request_logs` |
| Express 5 reenvia promesas rechazadas al filtro de errores | Cambia el cuerpo de algunos 500 | Suite + provocar un error real |
| `body-parser` 2 cambia defaults (`extended`) | Un POST con formulario podria dejar de parsearse | Login real (envia JSON) + un `multipart` (la subida de PT-124) |
| `req.query` pasa a solo lectura | Reventaria en ejecucion, no al compilar | Verificado: **nadie lo muta** en los 5 proyectos |
| `multer` sube de mayor con platform-express | PT-124 acaba de tocar ese interceptor | Repetir las cinco pruebas de subida de PT-124 |
| Swagger 7 -> 11 | Solo afecta fuera de produccion | `GET /docs` responde |

## Estrategia de vuelta atras

Rama propia. `package.json` + `package-lock.json` revertidos y `npm ci` devuelven el estado
anterior: **no se toca ni un dato**. Es la razon de haber hecho PT-125 aparte — si algo se rompe
aqui, se sabe que fue el framework y no bcrypt.

## Fuera de alcance

- Adoptar APIs nuevas de NestJS 11. Migrar y refactorizar a la vez hace imposible saber cual de las
  dos cosas rompio algo.
- Sustituir Express por Fastify.
- Los 3 avisos que quedaran despues (`file-type`, `linkify-it`, y lo que sobreviva): se vuelven a
  medir al terminar y se declaran en la linea base, no se esconden.

# Evidencia — PT-097

**Fecha**: 2026-07-27 · **Rama**: `test/PT-097-suites-completas`

## El hallazgo que justifica todo este PT

Al recrear el contenedor para correr las suites, **la API no arrancó**:

```
Nest can't resolve dependencies of the AccountVerificationService
(PrismaService, WalletService, PaymentTraceService, StructuredLogger, ?).
Please make sure that the argument PaypalProvider at index [4] is available
in the WalletModule context.
```

PT-092 añadió `PaypalProvider` a `AccountVerificationService`, que vive en `WalletModule`.
`PaymentsModule` no lo exportaba.

**Los 458 tests unitarios pasaban.** Construyen `TestingModule` aislados con dobles para cada
dependencia, de modo que **nunca ejercitan el grafo real**: qué módulo exporta qué y quién puede
inyectar qué. Ese hueco solo se ve levantando la aplicación.

Es el argumento entero de PT-097 en un caso: cinco PT se acumularon sobre una suite que no se
había corrido, y el fallo era de los que impiden arrancar.

## El segundo hueco, en la propia suite

La fase de humo recorre BASE, CLIENT y ADMIN. Son sitios **SSR**: si la API está muerta, sus
páginas **renderizan igual** con datos vacíos y la suite pasa.

Es decir: **la suite de QA no comprobaba que la API arrancara**. Se añade esa comprobación al
principio del runner — cuesta una línea y evita interpretar 164 checks de una aplicación que no
existe.

## Lo corregido

| | |
|---|---|
| `PaypalProvider` exportado por `PaymentsModule` | La API arranca: HTTP 200 |
| Guarda de arranque en `run-all.sh` | Aborta antes de las fases si la API no responde |
| `account_verifications` en el truncado | La tabla de PT-092 se reinicia entre corridas |

## Un intento que se descartó

Se escribió un test que compilaba `WalletModule` y `PaymentsModule` reales para validar el grafo.
**Cuelga**: importar los módulos arrastra BullMQ y Redis, y el test se queda esperando conexión.
Se retiró.

La conclusión es incómoda pero honesta: **para esto no hay atajo unitario**. Lo que valida el
grafo de dependencias es levantar la aplicación, y por eso la guarda va en el runner de QA y no
en Jest.

## Suites unitarias

```
API      458 tests   (64 suites)
CLIENT    71 tests   ( 5 suites)
CORE     134 tests   ( 8 suites)
         ───────────
         663 tests
```

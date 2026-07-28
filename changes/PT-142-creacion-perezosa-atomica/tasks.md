# PT-142 — Tareas atómicas

**Prerequisito**: ninguno. PT-136 ya está fusionado.
Ninguna empieza antes del ACK del Proposal Gate.
**Regla que gobierna las del monedero**: es dinero. Nada se da por bueno sin ejercer el ciclo de pago
real; la suite en verde no basta.

---

## PT-142.1 — Repetir el barrido, entero

- **Objetivo**: saber cuántos sitios son antes de tocar ninguno. El primer barrido buscó
  `findUnique|findFirst` + `.create(` a seis líneas; puede haberse dejado casos.
- **Entrada**: `src/api/src/**`. Se repite con `count`, con distancias mayores, y con `create` en otra
  función del mismo servicio.
- **Salida**: tabla `sitio | modelo | ¿en tx? | ¿restricción única? | veredicto`.
- **Validación**: **ningún sitio sin veredicto.** Lo que quede fuera del alcance se declara por
  escrito, no se calla.
- **Status**: PENDING

## PT-142.2 — RED: la prueba concurrente del monedero

- **Objetivo**: reproducir la carrera. Sin esto no se puede saber si se arregló.
- **Entrada**: `wallet.service.ts:27-33`.
- **Salida**: prueba que lanza **N creaciones simultáneas** del monedero del mismo usuario y exige un
  solo monedero y **cero errores**.
- **Validación**: **falla hoy con `P2002`.** Si no falla, la prueba no reproduce la carrera y se
  rehace **antes** de tocar el servicio.
- **Status**: PENDING

## PT-142.3 — RED: la prueba concurrente del arranque

- **Objetivo**: el sitio 1, que es el que CI cazó.
- **Salida**: prueba que ejecuta `seed()` en paralelo consigo mismo contra una base vacía.
- **Validación**: falla hoy con `Unique constraint failed on the fields: (key)`.
- **Status**: PENDING

## PT-142.4 — GREEN: `upsert` en `system-config`

- **Entrada**: `system-config.service.ts:189-205`.
- **Salida**: `upsert` con `update: {}` — si existe **no se toca**: es creación perezosa, no
  sincronización. Que un arranque no pise la configuración que otro dejó importa.
- **Validación**: PT-142.3 en verde.
- **Status**: PENDING

## PT-142.5 — GREEN: `upsert` en los tres sitios del monedero

- **Entrada**: `wallet.service.ts:27-33`, `:151-152`, `:412-415`.
- **Salida**: los tres con `upsert`. Los dos de dentro de `tx` lo usan **sobre `tx`**, no sobre
  `this.prisma`: sacarlos de la transacción rompería la atomicidad del asiento, que es lo que PT-087
  construyó.
- **Validación**: PT-142.2 en verde.
- **Status**: PENDING

## PT-142.6 — El depósito real, a un usuario sin monedero

- **Objetivo**: **la barra de este PT.** El monedero es dinero.
- **Entrada**: usuario nuevo, sin monedero. Ciclo de pago completo.
- **Salida**: depósito acreditado; **un solo asiento** en `payments` para esa referencia; el saldo,
  exacto.
- **Validación**: en la base, no en un log. Si esto no pasa, el PT no está hecho aunque todo lo demás
  esté verde.
- **Status**: PENDING

## PT-142.7 — El cierre de subasta, con holdback

- **Objetivo**: el sitio 4 toca el abono al vendedor.
- **Salida**: subasta cerrada de punta a punta; el ingreso entra a `pendingBalance` y **no** a
  disponible (PT-071).
- **Validación**: los importes, en la base. Un holdback que se salta es dinero entregado antes de
  tiempo.
- **Status**: PENDING

## PT-142.8 — Casos de control de las pruebas concurrentes

- **Objetivo**: RULE-14. Una prueba de concurrencia que pasa siempre no prueba nada.
- **Salida**: (a) con `upsert`, N simultáneos → 1 fila, 0 errores; (b) revirtiendo a `findX + create`
  la prueba **vuelve a fallar**; (c) creación secuencial → pasa en los dos casos, para demostrar que
  lo que distingue es la concurrencia.
- **Validación**: los tres. **(b) es el que importa**: demuestra que la prueba mide lo que dice.
- **Status**: PENDING

## PT-142.9 — RED + GREEN: la guarda RULE-22

- **Objetivo**: D5. Que no vuelva un quinto sitio.
- **Salida**: `creacion-perezosa-atomica.spec.ts` — detecta `findUnique`/`findFirst` seguido de
  `create` sobre **el mismo modelo** dentro de la misma función.
- **Validación**: falla contra el código de hoy nombrando los cuatro sitios; pasa después. Casos de
  control: (a) `findX` + `create` de **modelos distintos** → pasa, no es la carrera; (b) `upsert` →
  pasa; (c) `findX` + `create` del mismo modelo → **falla**.
- **Status**: PENDING

## PT-142.10 — `test-integration` en verde, y los dos jobs que nunca corrieron

- **Objetivo**: lo que este PT desbloquea.
- **Salida**: corrida de CI con `test-integration` en verde → **`build` y `docker` se ejecutan por
  primera vez en la historia del repositorio**.
- **Validación**: los ocho jobs, ejecutados. Si `build` o `docker` fallan, **se trian igual**: defecto
  del job → se corrige; defecto del repositorio → PT propio. La regla de PT-136 sigue en vigor.
- **Status**: PENDING

## PT-142.11 — Regresión completa

- **Salida**: 702 unitarias + las nuevas · 77 e2e · `lint` 0 errores.
- **Validación**: sin pérdidas.
- **Status**: PENDING

## PT-142.12 — Segunda escritura, evidencia y registro

- **Salida**: **RULE-22** en `11-Conventions.md` · nota en `CLAUDE.md` § monedero ·
  `evidence/PT-142/` con la prueba concurrente fallando y pasando, el depósito real y la corrida de
  CI · `HISTORY.log` + `HANDOFF.md` · `PENDING_TASKS.md`.
- **Validación**: STATE 5 completo. Es un BUG: queda `VALIDATION_PENDING`.
- **Status**: PENDING

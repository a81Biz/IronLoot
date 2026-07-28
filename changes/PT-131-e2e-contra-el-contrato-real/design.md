# PT-131 — Design: que los e2e prueben el contrato que existe

**Tipo**: BUG · **Complejidad**: STANDARD · **Origen**: PT-128, riesgo R1 · Sin hallazgo PTSA propio
**Estado**: **PENDIENTE DE ACK — Proposal Gate.** Ninguna rama abierta.
**Dependencia**: PT-128 (ya en `VALIDATION_PENDING`) — sin su corrección la suite ni siquiera termina.

---

## El problema en una frase

42 de 80 tests e2e fallan porque prueban un contrato anterior: envían `startsAt` en el pasado y 2
segundos de duración contra un DTO que exige fecha futura y mínimo una hora.

## Lo que este PT NO es

**No hay defecto de producto.** El producto valida bien; los tests son viejos. La única excepción
encontrada —el `500` del depósito— **ya tiene su sitio**: es PTSA **H-018**, y no se toca aquí.

---

## Decisiones

### D1 — Medir antes de arreglar

Con `beforeAll` en cascada, un solo fallo tumba una suite entera. Es plausible que corregir la
creación de subasta reduzca 42 fallos a unos pocos — o que descubra otros diez detrás.

**Primera tarea: corregir sólo la creación de subasta y volver a medir.** El número que salga
define el trabajo real. Diseñar el resto antes de ese dato sería adivinar.

### D2 — Un helper, no diez parches

Diez ficheros construyen su subasta a mano, cada uno con sus fechas. Si se corrigen uno a uno, el
próximo cambio del DTO vuelve a romper diez ficheros.

Se centraliza en el helper que ya existe (`test/core/auth-helper.ts` tiene precedente): una función
que devuelve un `CreateAuctionDto` **válido según el DTO de hoy**, con fechas derivadas del momento
de ejecución.

**La ventaja no es ahorrar líneas: es que el próximo cambio de contrato rompa un sitio y no diez.**

### D3 — Los specs se adaptan al producto, nunca al revés

`wallet.e2e-spec.ts` llama a `/wallet/deposit` sin el prefijo global y espera `currency: 'USD'`.
El sistema es **MXN exclusivamente** y tiene prefijo `/api/v1` desde hace meses.

Se corrigen los specs. **No se añaden alias de ruta ni se toca la moneda** para que un test viejo
acierte: sería adaptar el sistema a su descripción equivocada — el mismo error que PT-130 evita en
la documentación.

### D4 — Un test que falla por una razón nueva es un hallazgo, no una molestia

Si al corregir las fechas aparece un fallo que **no** es contrato viejo —un 500, un cálculo mal, un
estado imposible— se **registra** como hallazgo y no se maquilla para que pase.

Ya ocurrió una vez en esta cadena: el `500` del depósito salió así, y es H-018.

### D5 — Duración mínima de 1 hora contra subastas que deben cerrar en el test

Aquí hay una tensión real. El DTO exige **1 hora** de duración; varios specs necesitan que la
subasta **cierre** para probar el pedido, el envío o la valoración.

Tres salidas, y hay que elegir con criterio:

| | Salida | Coste |
|---|---|---|
| **a** | Crear con 1 h y **adelantar `endsAt` en la base** antes de disparar el cierre | El test manipula estado directamente; se salta la validación a propósito y hay que decirlo |
| **b** | Hacer la duración mínima configurable y bajarla en `NODE_ENV=test` | Toca **producto** para que un test pase. Debilita una regla de dominio en un entorno |
| **c** | Exponer un endpoint de cierre forzado sólo en test | Superficie nueva, aunque sea de test |

**Se propone (a)**: es la única que no toca el producto ni su superficie. El test crea la subasta
por la vía pública —validaciones incluidas— y sólo después ajusta `endsAt` en la base, **con
comentario que explique por qué**.

(b) es tentadora y peligrosa: una regla de dominio que se relaja por entorno acaba relajada donde
no debe. (c) añade superficie que alguien acabará alcanzando.

> **Decisión secundaria para el Gate.** Si se prefiere (b), es una decisión de dominio, no de tests.

---

## Alternativas descartadas

**Borrar los specs que fallan.** Dejaría el job verde y sin cobertura. Es exactamente la forma en
que muere un control.

**`skip` sobre los 10 ficheros hasta «tener tiempo».** Igual que lo anterior, con peor conciencia:
un `skip` sin fecha es un borrado lento.

**Reescribir la suite e2e desde cero.** Mucho mayor, y tira cobertura que hoy funciona en 6 suites.

**Bajar la duración mínima en el producto** — ver D5, opción (b).

---

## Componentes tocados

| Fichero | Cambio |
|---|---|
| `src/api/test/core/*` | Helper de subasta válida (**nuevo**) |
| `src/api/test/e2e/` (10 ficheros) | Usar el helper; corregir rutas y moneda en `wallet` |
| **Producto** | **Ninguno** |

---

## Criterio de éxito

1. Los 17 ficheros e2e **pasan**.
2. `test-integration` en **verde**, y `build` y `docker` se ejecutan por primera vez.
3. **Cero cambios en `src/api/src/`**. Si hace falta uno, es un hallazgo y va por su camino.
4. Cada fallo nuevo que no sea contrato viejo, **registrado**.

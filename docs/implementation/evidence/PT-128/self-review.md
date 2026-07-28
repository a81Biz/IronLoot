# PT-128 — Self-Review (STATE 5)

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-128-integracion-que-verifica` · **Origen**: PTSA H-015

---

## Lista de comprobación FDGE

- [x] **¿Criterios de éxito verificados?** Cuatro de seis. **Dos no, y se dicen:**

  | # | Criterio | Resultado |
  |---|---|---|
  | 1 | `test-integration` termina y en verde, 17 ficheros | ⛔ **NO** — termina, pero **rojo**: 42 de 80 tests fallan por specs viejos |
  | 2 | `build` y `docker` se ejecutan | ⛔ **NO** — siguen bloqueados mientras el job esté rojo |
  | 3 | El job aplica el esquema con `migrate deploy` | ✅ `db:generate` + `db:migrate:deploy`, y la guarda prohíbe `db push` |
  | 4 | Si se usa `--forceExit`, hay diagnóstico | ✅ **no hizo falta**: la suite termina sola en 13,2 s |
  | 5 | `audit:observability` corre en CI | ✅ job `observabilidad`, sin `needs` |
  | 6 | El job falla si algo se rompe | ✅ AC-04 y AC-08 lo prueban; y hoy está rojo de verdad |

  **Los criterios 1 y 2 no se cumplen, y no por lo que este PT hace mal**: la suite e2e arrastra
  specs escritos contra un contrato anterior. Está fuera de alcance por decisión explícita del
  `out-of-scope`, y se abre **PT-131**.

- [x] **¿Escenarios del paquete pasando?** E1 (termina) ✅ · E2 (sin `--forceExit`) ✅ · E3
      (`build`/`docker`) ⛔ · E4 (el job verifica migraciones) ✅ · C1 ✅ · C2 ✅ · C3 ✅ · B1–B4 ✅.

- [x] **¿Sin efectos colaterales?** Los cuatro checkpoints en línea base tras el cambio. Los ocho
      contenedores `healthy`. `/api/v1/health` 200. 619 tests verdes.

- [x] **¿Convenciones respetadas?** La guarda copia el patrón del repositorio: función pura
      exportada (`bloqueDelJob`) con casos de control. Jobs de CI sin `needs`, como `security-audit`.

- [x] **¿Commits atómicos y trazables?** Uno de implementación y uno de registro.

- [x] **¿Sin artefactos de depuración?** Base `pt128_e2e` eliminada al cierre.

- [x] **¿Documentación actualizada?** `audit-scope.yaml`: D3 pasa a CI, D1.N1 sale de
      `ci_checkpoints` con el motivo escrito.

---

## Lo que se encontró y no se buscaba

### 1. Las fugas eran de producto, no de tests

El diagnóstico previsto era «manejadores abiertos en la suite e2e». Lo que había eran **dos
clientes Redis creados fuera del ciclo de vida de Nest**:

```
app.module.ts:86              new Redis(...) suelto en la fabrica del ThrottlerModule
distributed-lock.service.ts   new Redis(...) en el constructor, sin OnModuleDestroy
```

Nest no los conocía, así que `app.close()` no los cerraba. **No es sólo cosa de tests**: en un
apagado ordenado —SIGTERM a un contenedor— esas conexiones tampoco se cerraban. `app.close()` no
liberaba todo lo que decía liberar.

Medido: la suite pasa de **necesitar `--forceExit`** a **terminar sola en 13,2 s**.

### 2. El checkpoint D3 cazó un error mío, dentro de este mismo PT

Los dos `catch` que escribí para el cierre eran **mudos**. `audit:observability` lo cantó:

```
silent_failure_count = 27   (linea base: 25)
```

Corregido: ahora registran antes de forzar la desconexión. Vuelta a 25.

Es la mejor prueba posible de que el checkpoint sirve: detectó una regresión introducida por el PT
que estaba añadiendo controles.

### 3. La guarda del job se acusó a sí misma

Su primera versión buscaba `db push` en el bloque del job **incluidos los comentarios** — y el
comentario que explica *por qué no se usa `db push`* la hacía fallar. Corregido: descarta
comentarios, y hay un caso de control (AC-08) que lo fija.

### 4. La suite e2e tiene 42 fallos por specs viejos

**El riesgo R1 del plan, materializado.** Sólo se había ejecutado `auth` (9 tests). Al correr los
17 ficheros: **42 fallos de 80 tests en 10 suites**.

Causa dominante, medida: los specs envían `startsAt` **en el pasado** y una duración de **2
segundos**; el DTO de subasta exige fecha futura y **mínimo 1 hora**. Los specs se escribieron
contra un contrato anterior. **El producto es correcto; los tests son viejos.**

Fuera de alcance por decisión escrita en `out-of-scope.md`. Se abre **PT-131**.

### 5. Un 500 que sí es defecto de producto

`wallet.e2e-spec.ts` produjo un `500` distinto del patrón:

```
PayPal request to https://api-m.sandbox.paypal.com/v2/checkout/orders/PAY-100 failed with status 404
```

`POST /wallet/deposit` con una referencia desconocida hace que el adaptador de PayPal lance, nadie
lo captura, y sale un **500**. Un error del cliente registrado como fallo del servidor — el mismo
defecto que **PT-124 / F-41** cerró en otro sitio.

Registrado como **PTSA H-018**. No se corrige aquí: exige su propio Gate.

---

## Delta real vs planificado

| # | Desviación | Por qué |
|---|---|---|
| 1 | `--detectOpenHandles` **no se pudo ejecutar completo** | Agota el límite de 1 GB del contenedor (OOM). El diagnóstico se hizo leyendo el código y se **confirmó midiendo**: al cerrar los dos clientes, la suite termina sola |
| 2 | El diagnóstico no señaló Prisma ni Socket.io, que eran los candidatos previstos | Eran los dos Redis. `PrismaService` ya tenía `OnModuleDestroy` con `$disconnect` |
| 3 | Se corrigió **código de producción**, no sólo teardown de tests | El plan lo contemplaba: «Sólo se toca si el diagnóstico encuentra una fuga real». La encontró |
| 4 | **El job queda ROJO** | 42 specs viejos. Está fuera de alcance y se abre PT-131. Rojo y honesto es mejor que colgado y oculto, que es lo que había |

---

## Estado

**`VALIDATION_PENDING`.** H-015 pasa a `CORREGIDA` — `[R44]` reserva el cierre al humano.

**Con una salvedad que no se puede omitir**: el job de integración **no está verde**. Lo que este PT
arregla es que *pueda* estarlo, y que lo que falla se vea. Ponerlo verde exige PT-131.

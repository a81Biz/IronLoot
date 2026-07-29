# PT-142 — Evidencia: lo medido, en orden

> En `.md` a propósito. `.gitignore:161` excluye los volcados de evidencia, así que un `.txt` citado
> desde el self-review sería una cita a algo que no está en el repositorio (**F-136-A**).

## 1. RED — la carrera, reproducida

`creacion-perezosa-concurrente.e2e-spec.ts`, contra el código anterior:

```
✗ CC-01: 8 getWallet() simultaneos          P2002 — Unique constraint failed on the fields: (`user_id`)
✗ CC-03: 2 acreditaciones simultaneas       P2002
✓ AC-03: creacion SECUENCIAL                pasa
✓ CC-02: seed() en paralelo                 pasa   <- y esto es informativo, no un aprobado
```

**CC-02 pasando es el hallazgo, no el ruido.** El `seed()` concurrente **no** chocó contra la base de
desarrollo, porque las claves ya están sembradas y la rama del `create` no llega a ejecutarse. Es
exactamente el efecto que mantuvo los nueve sitios invisibles: **una base con historia tapa lo que
una vacía destapa.** CI, con base recién nacida, sí lo cazó — y de ahí salió este PT.

`AC-03` pasando en los dos estados es lo que demuestra que lo que distingue a CC-01 y CC-03 es la
concurrencia y no un detalle del entorno.

## 2. Las dos salidas evidentes que NO funcionan

Esto es lo que más costó, y ninguna de las dos se podía saber leyendo documentación.

### `upsert` **dentro** de una transacción interactiva no es atómico

```
tx.wallet.upsert({ where: { userId }, create: {...}, update: {} })
  ->  PrismaClientKnownRequestError: Invalid `tx.wallet.upsert()` invocation
      Unique constraint failed on the fields: (`user_id`)
```

Prisma no lo compila a `INSERT ... ON CONFLICT` ahí: emite `SELECT` y luego `INSERT`, así que la
ventana sigue abierta.

### `upsert` **fuera** de la transacción tampoco lo garantiza

```
this.prisma.wallet.upsert(...)   ->  P2002, con dos acreditaciones simultaneas
```

Y lo importante: **CC-01 (8 llamadas) pasó con `upsert`**. Si no hubiera una segunda prueba
concurrente sobre el depósito, se habría dado por bueno. Pasó por suerte, no por corrección.

### Lo que sí es atómico

`createMany({ data: [...], skipDuplicates: true })` → `INSERT ... ON CONFLICT DO NOTHING`. **No
lanza.** La carrera la resuelve el índice único de `schema.prisma:761`. Luego se lee la fila, propia
o ajena, indistintamente.

## 3. GREEN

```
✓ CC-01  ✓ CC-03  ✓ AC-03  ✓ CC-02  ✓ ARR-02        5/5
```

Los tres caminos del monedero pasan por un único `asegurarMonedero(userId, isActive)`.

## 4. La barra del PT — depósito real, medido en la base

```
monederos ANTES del deposito: 0     (usuario recien creado, sin monedero)
monederos DESPUES:            1
saldo:                        321.5
asientos:                     1
referencia:                   PT142-REAL-1785286693045
invariante ledger == saldo:   SI
```

Es el importe de PT-087 —los 321.50 MXN que se capturaron en PayPal y no llegaron al monedero—
usado a propósito: el camino que aquel PT abrió sigue abierto, y ahora además es atómico.

## 5. Regresión

```
Test Suites: 95 passed, 95 total
Tests:      713 passed, 713 total          (702 + 11 de la guarda RULE-22)
```

Seis unitarias simulaban la forma anterior (`findUnique`/`create`) y se actualizaron **conservando lo
que afirman**: que un depósito sin monedero previo lo crea y acredita (PT-087) se sigue comprobando,
con otro doble.

## 6. Lo que este PT NO cierra, y está medido

**PT-146.** Quitado el `P2002`, aparece la carrera de debajo:

```
2 depositos simultaneos de 100 y 250, usuario sin monedero
  estados:  fulfilled | fulfilled      <- ninguno falla
  esperado: 350
  real:     250   (y 100 en otra corrida)
```

*Leer-modificar-escribir* sobre el saldo. **Los dos responden con éxito y uno se pierde en silencio**,
dejando su asiento en `ledger` con un `balanceAfter` que no cuadra. Estaba declarado fuera de alcance
en `out-of-scope.md` **antes** de medirlo.

## 7. CI — las tres corridas de este PT

| Job | 1ª (30412680336) | 2ª (30412948367) | 3ª (30413196348) |
|---|:--:|:--:|:--:|
| `lint` | ✅ | ✅ | ✅ |
| `security-audit` (D2) | ✅ | ✅ | ✅ |
| `schema-drift` (D2) | ✅ | ✅ | ✅ |
| `observabilidad` (D3) | ❌ | ❌ | **✅** |
| `test-unit` | ✅ | ✅ | ✅ |
| `test-integration` | ❌ | ❌ | ❌ |
| `build` · `docker` | skip | skip | skip |

**D3, corrida 1** — acusó mis dos `catch` por traducir `P2002` sin dejar rastro. Correcto: se añadió
el `warn`.

**D3, corrida 2** — siguió rojo, y aquí estaba el falso positivo:

```
NUEVOS catch que no registran ni relanzan:
  src/api/src/modules/system-config/system-config.service.ts:223
```

El mismo `catch` que la línea base declara como `:211`, **desplazado doce líneas**. → **F-142-A**.

**D3, corrida 3** — verde tras mover el número. Confirma el diagnóstico: no había ningún `catch`
nuevo.

### `test-integration`: 75/82, y ninguno de los 7 fallos es de PT-142

```
Test Suites: 2 failed, 15 passed, 17 total
Tests:       7 failed, 75 passed, 82 total      (era 66/77 antes de este PT)
```

| Suite | Fallo | De quién es |
|---|---|---|
| `ratings.e2e` | `expected 201, got 404` — el pedido no existe | **PT-143**: los workers comparten base y se borran datos entre sí |
| `payments.e2e` | `expected 201, got 500` — `POST /payments/initiate` con PayPal | Necesita una **pasarela real**. `PENDIENTES` § S-002 ya lo señaló como candidato a job nocturno |

**Consecuencia honesta: PT-142 NO desbloquea `build` ni `docker`.** Los dos jobs que nunca se han
ejecutado siguen sin ejecutarse. El criterio 3 de este PT queda **incumplido**, no aproximado.

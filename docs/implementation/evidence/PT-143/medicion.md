# PT-143 — Evidencia

> En `.md` por la lección de **F-136-A**: `.gitignore:161` excluye los volcados, así que un `.txt`
> citado desde aquí sería una cita a algo que no está en el repositorio.

## 1. La causa, medida antes de tocar nada

```
$ grep -rc "deleteMany()" src/api/test/
  11 ocurrencias — TODAS en orders-flow.e2e-spec.ts
```

Once tablas truncadas enteras en un `beforeAll`: `rating`, `shipment`, `commissionRecord`,
`dispute`, `ledger`, `order`, `bid`, `auction`, `notification`, `wallet`, `session`. Con Jest
corriendo las 18 suites en paralelo.

Y la guarda encontró **tres más** que el barrido a mano no vio, todas con la forma `deleteMany({})`
—el mismo borrado con dos llaves de disfraz—: `auth.e2e:51` y `user-profile-sync:40,46`, que borraban
las sesiones de todos los workers.

## 2. Lo que explicaba

| Síntoma | Causa |
|---|---|
| `ratings.e2e`: `expected 201, got 404` | Su pedido lo borraba `order.deleteMany()` de otra suite |
| `auth-helper`: `auctions_seller_id_fkey` violada | Borraba usuarios cuyas subastas otro worker recreaba |
| **Los fallos cambiaban de sitio entre corridas** | Es una carrera: depende de qué worker llegue antes |

## 3. Tres hallazgos que el diagnóstico no preveía

**`TestApp` imponía la base de desarrollo.** `test-app.ts:15` hacía
`process.env.DATABASE_URL = '...ironloot_db...'` — asignación directa, pisando el entorno. En una
máquina de desarrollo las pruebas corrían contra **la base que sostiene las validaciones PTSA**, y
`auth-helper.cleanup()` borra por patrón de correo. El comentario de `auth-helper` —*«Ideally we run
on test db»*— describía ese riesgo exacto **sin saber que había una línea que lo garantizaba**.

**`auth-helper` afirmaba algo falso**: *«cascade deletes profile, auctions, etc»*. No cascadea.

**El job `docker` estaba condicionado a las ramas fantasma de PT-136** — ver § 5.

## 4. La suite e2e no cabe en el contenedor

```
$ docker exec ironloot-api npx jest --config ./test/jest-e2e.json
  A jest worker process was terminated by another process: signal=SIGKILL
```

OOM contra el límite de 1 GB, lo mismo que midió PT-128. **CI es el único sitio donde esto se
verifica** — otra manifestación de F-135-B.

## 5. Los ocho jobs, ejecutados por primera vez

| Job | Antes de esta tanda | Corrida final (30414378969) |
|---|:--:|:--:|
| `lint` | nunca | ✅ |
| `security-audit` (D2) | nunca | ✅ |
| `schema-drift` (D2) | nunca | ✅ |
| `observabilidad` (D3) | nunca | ✅ |
| `test-unit` | nunca | ✅ |
| `test-integration` | nunca | ✅ **82/82** |
| `build` | nunca | ✅ |
| `docker` | nunca | ❌ **PT-147** |

**`test-integration` en verde es el criterio de este PT.** Pasó de 66/77 → 75/82 → **82/82**.

### El último engaño, y era el mejor

`docker` seguía `skipped` con el workflow declarándose `success`:

```yaml
if: github.ref == 'refs/heads/prod' || github.ref == 'refs/heads/prep'
```

**Las mismas dos ramas fantasma que PT-136 retiró del disparador**, vivas cincuenta líneas más abajo.
Es un escalón peor que H-015: allí `build` y `docker` no corrían por colgar de un job que no
terminaba, y **eso se veía**. Aquí un job saltado **no cuenta como fallo** y el pipeline decía verde.

Corregido el `if:`, el job corre y falla:

```
ERROR: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
```

`file: ./Dockerfile` **no existe**. Las imágenes de producción las creó PT-129 y viven en `src/api/`,
`src/admin/`, `src/apps/base/` y `src/apps/client/`. **Ninguna imagen se ha construido nunca en CI.**
→ **PT-147**, deliberadamente fuera de este PT: construir cuatro imágenes y arrancarlas tiene su
propia verificación.

## 6. La guarda se acusó a sí misma, dos veces

**Sexta vez de la tanda**: los casos de control de `limpieza-de-tests-acotada.spec.ts` **contienen**
el patrón prohibido, y tienen que contenerlo para demostrar que sabe detectarlo.

**Séptima, y es la que importa**: al ampliar la guarda de ramas a las condiciones `if:`, leyó **mi
propio comentario** de `ci.yml` —que cita `refs/heads/prod` para explicar el defecto— como una
condición viva.

No es cosmético: sin el arreglo, **documentar por qué una rama se retiró haría fallar la guarda**, de
modo que la única forma de tenerla en verde sería no explicar nada. Una guarda que penaliza escribir
la razón acaba produciendo ficheros sin razones. Fijado como caso de control **C11**.

## 7. Regresión

```
Unitarias:  726 / 726   en 96 suites   (721 + 5 de la guarda ampliada)
e2e:         82 / 82    en CI, en paralelo, contra base vacía
lint:        0 errores
```

# PT-142 — Design: la creación perezosa que no es atómica

**Tipo**: BUG · **Complejidad**: STANDARD
**Origen**: triaje de PT-136.5. Lo cazó la **primera ejecución de CI** de este repositorio.
**Desbloquea**: `build` y `docker`, que nunca se han ejecutado.

## El defecto

Cuatro sitios comprueban si una fila existe y, si no, la crean — sin nada que impida que otro proceso
la cree entremedias.

| # | Sitio | ¿En `tx`? | Qué crea |
|---|---|:--:|---|
| 1 | `system-config.service.ts:191-194` | No | Configuración, en `onModuleInit` |
| 2 | `wallet.service.ts:27-33` — `getWallet()` | No | **Un monedero**, perezosamente |
| 3 | `wallet.service.ts:151-152` — depósito | Sí | **Un monedero**, dentro del asiento |
| 4 | `wallet.service.ts:412-415` — cierre de subasta | Sí | **El monedero del vendedor** |

Lo que CI vio, en el sitio 1:

```
prisma:error  Invalid `any).create()` invocation in system-config.service.ts:194:49
              Unique constraint failed on the fields: (`key`)
```

## Dos cosas que conviene no dar por sabidas

**Estar dentro de una transacción no cierra la ventana.** Prisma usa *read committed*: dos
transacciones concurrentes pueden leer las dos la **ausencia** de la misma fila e intentar crearla.
La transacción da atomicidad sobre lo que escribe, no exclusión mutua sobre algo que todavía no
existe. Por eso los sitios 3 y 4 están afectados aunque usen `tx`.

**La restricción de unicidad no es el problema: es lo que lo hace visible.**
`schema.prisma:761` — `userId String @unique`. Sin ella no habría error; habría **dos monederos para
el mismo usuario**, y el saldo dependería de cuál leyera cada consulta. El error es la restricción
haciendo su trabajo.

## Por qué esto no es un problema de tests

Los sitios 2 y 3 están en el ciclo de pago. El caso concreto: **un usuario sin monedero cuya
notificación de depósito llega mientras carga su panel.** `getWallet()` y la acreditación corren a la
vez, y la acreditación es la que puede perder.

Eso es exactamente lo que PT-087 construyó el ciclo para impedir: *ningún pago cobrado queda sin
acreditar*. Hay reintento y el ciclo se reabre, así que el dinero no se pierde — pero **un fallo
evitable en el camino del dinero no es un fallo aceptable**, y el comentario del sitio 3 lo dice sin
saberlo: *«o se crea y acredita, o no ocurre ninguna de las dos»*.

Y el sitio 1 es riesgo de despliegue puro: dos instancias arrancando a la vez (despliegue progresivo,
escalado, tormenta de reinicios) y **la segunda cae en `onModuleInit`**.

## Por qué nadie lo había visto

Hacen falta dos condiciones a la vez, y en desarrollo **no se da ninguna**:

- **Concurrencia real** — una sola instancia, un solo navegador.
- **Una base sin las filas ya creadas** — la base de desarrollo tiene historia: el monedero existe,
  la configuración está sembrada, y la rama del `create` no se ejecuta nunca.

**CI da las dos**: Jest levanta varios workers y la base nace vacía.

Es la lección de PT-122 dada la vuelta. Allí el problema era que una base vacía devolvía `SIN_DATOS`
donde una con historia daba números; aquí es que **una base con historia tapa lo que una vacía
destapa**. En los dos casos, lo que se mide depende del estado previo — y ésa es la razón por la que
este defecto necesitaba que el pipeline corriera para existir a los ojos de alguien.

## Decisiones de arquitectura

### D1 — `upsert`, y la base resuelve la carrera

```
findUnique(...) ?? create(...)        ->    upsert({ where, create, update: {} })
```

La exclusión la hace el índice único, que es donde se hace bien. `update: {}` deja claro que si ya
existe **no se toca**: es creación perezosa, no sincronización.

### D2 — Los cuatro, no sólo el que falló

Arreglar sólo `system-config` —lo único que CI señaló— dejaría los tres del dinero, que son los
graves. El que se manifiesta primero no es el más importante.

### D3 — RED antes que GREEN, y con concurrencia de verdad

Una carrera «arreglada» sin una prueba que falle **no está arreglada**: no hay forma de saberlo. La
prueba lanza N creaciones simultáneas del mismo monedero y exige un solo ganador y ningún error.

Tiene que fallar hoy con `P2002`. Si no falla, la prueba no reproduce la carrera y hay que
rehacerla antes de tocar el servicio.

### D4 — El barrido se repite entero

El primero buscó `findUnique|findFirst` seguido de `.create(` en seis líneas. Se repite con `count`,
con distancias mayores, y con los `create` que estén en otra función. **Lo que quede sin cubrir se
declara**, no se calla.

### D5 — La guarda

**RULE-22**: ninguna creación de una fila con restricción de unicidad se hace con `findX` + `create`.
`upsert`, o `create` con manejo explícito de `P2002` y su motivo escrito.

La guarda es de análisis estático sobre `src/api/src/`: detecta `findUnique`/`findFirst` seguido de
`create` sobre **el mismo modelo** dentro de la misma función. Con casos de control en los dos
sentidos.

## El riesgo, y es uno concreto

**Tocar el monedero.** Es el dinero: saldo, fondos retenidos y ledger. `upsert` no debería cambiar
nada observable —el resultado es la misma fila— pero «no debería» no es un criterio.

Por eso la barra de este PT no es «pasan los tests»: es **un depósito real acreditado a un usuario
sin monedero previo**, con **un solo asiento** en `payments`. Es la lección de PT-087 y de la
validación por navegador de PT-134.

## Lo que este PT NO decide

- **No toca la idempotencia del asiento.** `Payment.reference` sigue siendo única y sigue siendo la
  garantía contra el asiento duplicado.
- **No cambia el nivel de aislamiento** de ninguna transacción.
- **No introduce cerrojos.** `distributed-lock.service.ts` existe, y usar coordinación de red para lo
  que una restricción ya declarada resuelve sería el remedio caro.
- **No arregla PT-143.** La suite sigue sin aislar datos entre workers; es otro PT.

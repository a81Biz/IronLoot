# PT-080 Fase A — Entrada de notificaciones

**Fecha**: 2026-07-26 | **Tareas**: PT-080.2 · .3 · .4 · .5

---

## Cambio

`MercadoPagoProvider.handleWebhook` deja de enrutar por **la forma del identificador**
(`/^(ORD|PAY)/i`) y pasa a hacerlo por el **topic**, como documenta Mercado Pago:

1. **Normalización** de la notificación a `{formato, tipoRecurso, idRecurso}`.
   - `WEBHOOK` — `data.id` en query.
   - `IPN` — `topic` + `id` en query, sin `data.id`.
2. **Validación por formato**: en Webhooks se exige HMAC válido (fallo → **401**); en IPN la
   firma no es validable, de modo que la confirmación contra la API es obligatoria y su
   respuesta es la única fuente de verdad.
3. **Identificador canónico**: el id numérico de pago, único resoluble en `/v1/payments/{id}`.
   `order` y `merchant_order` se resuelven por `external_reference`.
4. **Anomalía**: varios pagos aprobados bajo una misma referencia → `ValidationException`, sin
   acreditar.

---

## Verificación contra la API real de Mercado Pago

Pago nuevo creado con la Orders API: orden `ORDTST01KYEKPGREK944M6K7T67WYHSE`, importe
**321.45 MXN**, pago canónico **170606120122**.

| # | Prueba | Resultado |
|---|---|---|
| 1 | **IPN puro** (`topic=payment&id=170606120122`) | ✅ **HTTP 201, acreditó**: 5567.50 → **5888.95** |
| 2 | Reentrega del mismo IPN | ✅ 201, saldo **sin cambio**, 4 reservas |
| 3 | **El mismo pago notificado como ORDEN** (`topic=order&id=ORDTST01KYEKPG...`) | ✅ 201, saldo **sin cambio** — resolvió al mismo id canónico |
| 4 | IPN sobre pago ya reservado (169718720683) | ✅ 201 (antes: **500**) |

**La prueba 3 es la corrección de F-02.** Antes de PT-080 esa misma secuencia habría creado una
segunda reserva con el id de orden y acreditado 321.45 **dos veces**.

**La prueba 1 es la corrección de F-05.** Antes, cualquier notificación en formato IPN devolvía
HTTP 500 y no acreditaba jamás.

### Estado de las reservas

```
ORDTST01KYEDNWKHXHCS58ZPA3GESWMT   (id de orden — anterior a PT-080)
ORDTST01KYEDQRYCC27CE8JRYR04XG4K   (id de orden — anterior a PT-080)
169718720683                        (id numérico)
170606120122                        (id numérico — creada por la Fase A)
```

Las dos primeras son la huella de F-02 en datos. Las nuevas ya usan siempre el canónico.

---

## Suites

| | Línea base (PT-080.1) | Ahora |
|---|---|---|
| API | 45 suites / 264 tests | ✅ **46 suites / 279 tests** |
| CORE | 8 / 134 | ✅ 8 / 134 |
| `typecheck` | ✅ | ✅ |

**15 tests nuevos** (`mercadopago-notification.spec.ts`), escritos en RED antes de implementar:
14 fallaban, 1 pasaba de forma vacua.

---

## El arnés, primero

`mp-notify.cjs` (PT-080.2) entrega en los dos formatos y con cualquier identificador. Su
ausencia es **la razón** por la que F-02 y F-05 sobrevivieron a una verificación que declaré
exitosa: el arnés anterior solo sabía entregar en formato Webhooks con id de orden, que era
justo el único camino que funcionaba.

---

## Pendiente

Fases B (ciclo persistido, vía garantizada, expiración a 72 h) y C (modularidad).
El pago perdido de hoy quedó recuperado manualmente; **la vía garantizada de la Fase B es lo que
impedirá que vuelva a ocurrir**.

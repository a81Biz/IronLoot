# PT-145 — Escenarios de prueba

## Valoraciones

| # | Escenario | Hoy | Esperado |
|---|---|---|---|
| RAT-01 | N valoraciones simultáneas del mismo autor sobre el mismo pedido | **Varias filas** | **Una**, y las demás con 400 |
| RAT-02 | Segunda valoración secuencial | 400 | 400 — la guarda de negocio no cambia |
| RAT-03 | Dos autores distintos sobre el mismo pedido | Dos filas | Dos filas. **La restricción es por (pedido, autor)**, no por pedido |
| RAT-04 | El mismo autor sobre pedidos distintos | Dos filas | Dos filas |

> RAT-03 y RAT-04 son los que impiden que la restricción sea demasiado ancha. Una que prohibiera de
> más rompería el producto en silencio.

## Verificación de cuenta — la que mueve dinero

| # | Escenario | Hoy | Esperado |
|---|---|---|---|
| VER-01 | N solicitudes simultáneas sobre el mismo método | **Dos verificaciones, dos envíos** | **Una**; las demás reciben la misma |
| VER-02 | Solicitud secuencial con una en curso | Devuelve la existente | Igual — idempotencia intacta |
| VER-03 | Solicitud tras una **expirada** | Crea una nueva | **Crea una nueva.** La invariante es *«una EN CURSO»*, no *«una en la vida»* |
| VER-04 | Dos métodos distintos del mismo usuario | Dos verificaciones | Dos. El bloqueo es por método |

> VER-03 es el que demuestra por qué una restricción única simple no servía: prohibiría verificar dos
> veces nunca. Y VER-04, por qué el bloqueo no puede ser por usuario.

## El esquema

| # | Escenario | Esperado |
|---|---|---|
| ESQ-01 | `npm run audit:schema` | **Verde.** Las migraciones reproducen `schema.prisma` |
| ESQ-02 | La migración aplicada | Presente en `_prisma_migrations`. **Nunca `db push`** — es H-014 |
| ESQ-03 | `AccountVerification` | **Sin cambios de esquema.** Su invariante es parcial y se resuelve bloqueando |

## La guarda RULE-22 y su caducidad

| # | Escenario | Esperado |
|---|---|---|
| G-01 | Con los dos sitios corregidos y las excepciones puestas | **Falla** — «ninguna excepción sobra». Es para lo que se escribió |
| G-02 | Tras retirarlas | Verde |

## Regresión

| # | Suite | Línea base |
|---|---|---|
| REG-01 | Unitarias | **728** + las nuevas |
| REG-02 | e2e en CI | 86 |
| REG-03 | `audit:schema` | Verde |

## Lo que NO se prueba aquí

- El flujo completo de verificación de cuenta (envío real, token, confirmación). Está cubierto por la
  suite de navegador (PT-134). Aquí se prueba que **no se cree dos veces**.

# PT-127 — Cambios de especificación

## API HTTP

**Ninguno.** Ni un endpoint nuevo, ni uno modificado, ni un contrato alterado. Este PT no toca la
capa HTTP.

## Modelo de datos (`schema.prisma`)

**Ninguno.** `schema.prisma` es el **objetivo** de este PT, no su variable. Los 33 modelos, 23
enums y todas las restricciones quedan exactamente como están.

Lo que cambia es que **las migraciones pasen a producir eso mismo**, cosa que hoy no hacen.

## Esquema físico de la base de datos

### En la base de desarrollo (`ironloot_db`) — sin cambio estructural

Aparece **una tabla nueva, y es de Prisma, no del dominio**:

```
_prisma_migrations    creada por `migrate resolve --applied`
```

Ninguna tabla del dominio se altera. `migrate resolve` no ejecuta DDL: sólo escribe el registro de
qué migraciones se consideran aplicadas.

### En un entorno limpio — cambio grande, y es el objetivo

Lo que hoy produce `migrate deploy` frente a lo que producirá:

| Objeto | Hoy | Después |
|---|---|---|
| tabla `account_verifications` | **no existe** | existe, con sus 3 índices y su FK |
| enum `PaymentMethodType` | **no existe** | existe |
| enum `AccountVerificationStatus` | **no existe** | existe |
| `NotificationType.AUCTION_SOLD` | **falta el valor** | presente |
| `payment_cycles.provider_ref` | **no existe** | existe |
| `user_payment_methods.type` | **no existe** | existe |
| `user_payment_methods.card_last4` | **no existe** | existe |
| `user_payment_methods.paypal_email` | **no existe** | existe |
| `payments.reference` | índice **corriente** | índice **ÚNICO** |

La última fila es la importante: es la restricción que CLAUDE.md declara como garantía de que un
reintento de acreditación no duplica el asiento contable.

## Contratos y tipos de TypeScript

**Ninguno.** El cliente Prisma se genera desde `schema.prisma`, que no cambia. Los tipos que hoy
usa la aplicación son exactamente los de después.

## Eventos y mensajería

**Ninguno.**

## Contratos operativos — aquí sí hay cambios, y afectan al día a día

### 1. Cómo se aplica un cambio de esquema

| | Antes | Después |
|---|---|---|
| Aplicar esquema en dev | `db push --accept-data-loss` en cada arranque | `migrate deploy` en cada arranque |
| Cambiar el esquema | editar `schema.prisma` y reiniciar | editar `schema.prisma` **y generar migración** (`npm run db:migrate`) |
| Si la aplicación falla | `db push` falla → respaldo → `echo` → **el arranque sigue** | `migrate deploy` falla → **el arranque falla** |

**Esto rompe una costumbre.** Quien edite `schema.prisma` y reinicie ya no verá su cambio aplicado
solo. Es el coste consciente de la corrección: el atajo que hacía cómodo el trabajo diario es
exactamente el que produjo H-014.

### 2. Script nuevo

```
npm --prefix ./src/api run audit:schema
```

Devuelve 0 si las migraciones reproducen `schema.prisma`, distinto de 0 si divergen. Se suma a la
familia existente: `audit:check` (D2), `audit:domain` (D1.N1), `audit:observability` (D3),
`audit:reliability` (D5).

### 3. Job de CI nuevo

`schema-drift`, **sin `needs`** — independiente, como `security-audit`. Un job roto no debe poder
ocultarlo, que es exactamente lo que le pasó a `build` y `docker` con H-015.

## Documentación que hay que actualizar

| Documento | Qué |
|---|---|
| `CLAUDE.md` § Development Commands | Que un cambio de esquema exige migración, no `db push` |
| `docs/enterprise-documentation/07-Database-Architecture.md` | El mecanismo de evolución del esquema |
| `PTSA/audit-scope.yaml` § `ci_checkpoints` | El checkpoint `D2 schema` deja de ser una declaración |

La última fila importa: `audit-scope.yaml` ya declara «`D2` … schema (`npm run typecheck` +
prisma)» — una declaración vaga que no comprobaba drift. Con `audit:schema` pasa a decir **dónde**
corre, que es el estándar que fijó PT-118.

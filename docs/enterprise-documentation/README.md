# `docs/enterprise-documentation/` — El contrato de agente

**Esto no es la documentación del producto.** La documentación del producto es **[`docs-v2/`](../../docs-v2/)**:
negocio, producto, arquitectura, ingeniería, UX y el Registro Maestro de ADR. Está escrita y mantenida
por personas, es más rica, y es la que hay que leer para entender IronLoot.

Lo que vive aquí es **lo que `docs-v2` no tiene y no debería tener**: el contrato que un agente
automático no puede romper.

| Documento | Qué es | Quién lo vigila |
|---|---|---|
| **[`11-Conventions.md`](./11-Conventions.md)** | Las reglas `RULE-NN`. Estructura, nomenclatura, patrones, y **veinticuatro reglas duras**, cada una con su porqué y el fallo real que la originó. | `reglas-citadas-existen.spec.ts` (RULE-27) y, una a una, las guardas que cada regla nombra |
| **[`10-Technical-Debt.md`](./10-Technical-Debt.md)** | El registro `TD-XXX`. Cerrar una deuda son **dos escrituras**: el código y esta tabla. | `coherencia-deuda-tecnica.spec.ts` (RULE-08), `coherencia-de-registros.spec.ts` (RULE-20) |
| **[`inventory/`](./inventory/)** | Seis inventarios derivables del código: rutas, endpoints, entidades, componentes, servicios, integraciones. | — |

## Inventario

| Fichero | Contenido |
|---|---|
| [inventory/routes.md](./inventory/routes.md) | Rutas de frontend (BASE + CLIENT + ADMIN) |
| [inventory/endpoints.md](./inventory/endpoints.md) | Endpoints REST del API |
| [inventory/entities.md](./inventory/entities.md) | Modelos y enums de Prisma |
| [inventory/components.md](./inventory/components.md) | Módulos NestJS por servicio |
| [inventory/services.md](./inventory/services.md) | Servicios inyectables |
| [inventory/integrations.md](./inventory/integrations.md) | Integraciones externas |

## Qué pasó con `01`…`09` (ADR-049, PT-141)

Había **dos árboles de documentación declarándose mutuamente sustitutos**. Este decía de sí mismo
*«toca regenerar. Decisión del humano»*; `docs-v2/` se declaraba *«la única fuente de verdad»*. Y
`CLAUDE.md` —el documento que gobierna a todo agente— citaba a este **diez veces** y a `docs-v2`
**una**. Los commits `6decb1a` y `4f40358` escriben en los dos: **cada PT pagaba la escritura doble**,
y la divergencia era cuestión de tiempo. H-016 ya demostró lo que ocurre cuando una cita precisa deja
de ser cierta: se lee con confianza y es falsa.

La decisión **no fue «uno gana»**: eran dos funciones mezcladas. Una describe el producto; la otra le
dice a un agente qué no puede romper.

Los nueve están en **[`archive/`](./archive/)** — no borrados, y con su destino documento a documento.
El inventario que sostiene la tabla de abajo verificó la premisa en vez de asumirla, y está en
[`evidence/PT-141/inventario-de-solapamiento.md`](../implementation/evidence/PT-141/inventario-de-solapamiento.md).

| Archivado | Dónde está ahora lo que decía |
|---|---|
| [`archive/01-Platform-Overview.md`](./archive/01-Platform-Overview.md) | `docs-v2/1-negocio/Objetivos-Alcance-Stakeholders-KPIs.md` + el BRD |
| [`archive/02-PRD.md`](./archive/02-PRD.md) | `docs-v2/1-negocio/PRD-Product-Requirements.md` |
| [`archive/03-TRD.md`](./archive/03-TRD.md) | `docs-v2/3-arquitectura/Software-Architecture-Document.md` + `docs-v2/4-ingenieria/Software-Design-Document.md` |
| [`archive/04-App-Flow.md`](./archive/04-App-Flow.md) | `docs-v2/2-producto/Casos-de-Uso-Detallados.md` + `User-Story-Mapping.md` |
| [`archive/05-UIUX-Brief.md`](./archive/05-UIUX-Brief.md) | `docs-v2/7-ux/Manual-de-Usuario.md` + `Manual-de-Administrador.md` |
| [`archive/06-Backend-Architecture.md`](./archive/06-Backend-Architecture.md) | `docs-v2/3-arquitectura/Software-Architecture-Document.md` + `DDD-Bounded-Contexts.md` |
| [`archive/07-Database-Architecture.md`](./archive/07-Database-Architecture.md) | `docs-v2/4-ingenieria/Modelo-de-Datos.md` |
| [`archive/08-API-Catalog.md`](./archive/08-API-Catalog.md) | `docs-v2/4-ingenieria/Catalogo-de-API.md` |
| [`archive/09-Security-Architecture.md`](./archive/09-Security-Architecture.md) | `docs-v2/3-arquitectura/Software-Architecture-Document.md` § seguridad |

### `03-TRD.md` sigue vigilado

Es el único archivado con una guarda encima: `coherencia-documentacion-codigo.spec.ts` (PT-130)
comprueba sus **nueve citas** `fichero:línea` — que la línea contenga el paquete que dice, y que la
versión coincida. **Archivar no lo hace menos verificable**: sus citas siguen siendo ciertas o falsas
exactamente igual, y lo que cambia es su estatus, no su exactitud. Dejar de comprobarlas al moverlo
habría devuelto H-016 con aval.

### Lo que se corrigió en `archive/` antes de archivarlo (PT-109, 27-jul)

Se conserva porque explica por qué los archivados no son basura: se mantuvieron con cita hasta el
final.

| Documento | Qué decía | Qué dice ahora |
|---|---|---|
| `03-TRD` · `05-UIUX-Brief` · `09-Security-Architecture` | `'unsafe-inline'` en la CSP «necesario para las plantillas» | **No está en ninguna directiva**: fuera de `script-src` por PT-096, de `style-src` por PT-105 |
| `09-Security-Architecture` | TOTP de admin «opcional» | **Obligatorio en producción** desde PT-093: el arranque aborta sin él |
| `10-Technical-Debt` (TD-005) | Citaba un comentario del código que ya no existe | Cita las dos guardas que lo vigilan |
| `inventory/services.md` | Faltaban 5 servicios | `AccountVerificationService`, `WithdrawalsService`, `EmailService`, `HealthService`, `AuditPersistenceService` |
| `inventory/endpoints.md` | Faltaban los 7 endpoints de métodos de cobro | Añadidos con su línea en el controlador |

## Para una futura ejecución de Foundation Protocol

`[START FOUNDATION]` genera **sólo** lo de la primera tabla. Si una ejecución vuelve a emitir los
nueve, está deshaciendo ADR-049 — **retira antes la ADR o no lo hagas**.

Se vuelve a ejecutar cuando: se añade un servicio nuevo, el esquema de Prisma gana o pierde un modelo,
entra un patrón arquitectónico nuevo, pasan más de 3 meses sin ejecución, o se invoca
`[START FOUNDATION]` explícitamente.

---

**Generado:** 2026-06-23 (Foundation Protocol 1.0, primera ejecución) · **Acotado a contrato de
agente:** 2026-07-29 (PT-141, ADR-049)
**Alcance:** `src/` (api, apps/base, apps/client, admin, packages/core, nginx) + `docker-compose.yml`
+ `src/api/prisma/schema.prisma`
**Decisión de referencia:** ADR-049 en [`docs-v2/transversal/Registro-Maestro-de-ADR.md`](../../docs-v2/transversal/Registro-Maestro-de-ADR.md)

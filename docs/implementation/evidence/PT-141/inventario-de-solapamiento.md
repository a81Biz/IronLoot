# PT-141.A.2 — Inventario de solapamiento

**No se asume la premisa del README de `docs-v2`** —*«sustituye funcionalmente»*—: se comprueba
documento a documento. Archivar algo sin equivalente sería perder contenido, y el archivo sin mapa es
un cementerio.

## Los doce de `docs/enterprise-documentation/`

| Documento | Equivalente en `docs-v2/` | Decisión |
|---|---|---|
| `01-Platform-Overview.md` | `1-negocio/Objetivos-Alcance-Stakeholders-KPIs.md` + `BRD` | **Archivar** |
| `02-PRD.md` | `1-negocio/PRD-Product-Requirements.md` | **Archivar** |
| `03-TRD.md` | `3-arquitectura/Software-Architecture-Document.md` + `4-ingenieria/Software-Design-Document.md` | **Archivar** — ver nota |
| `04-App-Flow.md` | `2-producto/Casos-de-Uso-Detallados.md` + `User-Story-Mapping.md` | **Archivar** |
| `05-UIUX-Brief.md` | `7-ux/Manual-de-Usuario.md` + `Manual-de-Administrador.md` | **Archivar** |
| `06-Backend-Architecture.md` | `3-arquitectura/Software-Architecture-Document.md` + `DDD-Bounded-Contexts.md` | **Archivar** |
| `07-Database-Architecture.md` | `4-ingenieria/Modelo-de-Datos.md` | **Archivar** |
| `08-API-Catalog.md` | `4-ingenieria/Catalogo-de-API.md` | **Archivar** |
| `09-Security-Architecture.md` | `3-arquitectura/Software-Architecture-Document.md` § seguridad | **Archivar** |
| **`10-Technical-Debt.md`** | **ninguno** — `docs-v2` no tiene registro `TD-XXX` | **CONSERVAR** |
| **`11-Conventions.md`** | **ninguno** — `docs-v2` no tiene las `RULE-NN` | **CONSERVAR** |
| **`inventory/`** (6 ficheros) | parcial en `4-ingenieria/`, pero no como inventario derivable | **CONSERVAR** |

## Los tres que se conservan, y por qué no es arbitrario

**`11-Conventions.md`** — Las **veinte reglas** `RULE-NN`. Es el contrato operativo de todo agente que
toca este repositorio, y Foundation Protocol lo llama *«el output más crítico»*. `docs-v2` documenta
el producto para personas; esto le dice a un agente qué no puede romper. **No es el mismo documento
con otro nombre: es otra cosa.**

**`10-Technical-Debt.md`** — El registro `TD-XXX`, con guarda propia desde PT-103
(`coherencia-deuda-tecnica.spec.ts`) y ahora también desde PT-140. `docs-v2/transversal/` tiene
`Registro-de-Hallazgos.md`, que es de auditoría, no de deuda: son ciclos distintos.

**`inventory/`** — Seis inventarios derivables del código (rutas, endpoints, entidades, componentes,
servicios, integraciones). `4-ingenieria/Catalogo-de-API.md` cubre parte de `endpoints`, no el resto.

## Nota sobre `03-TRD.md`

Es el que más cuesta archivar: sus citas `fichero:línea` son las que vigila
`coherencia-documentacion-codigo.spec.ts` desde PT-130, y son **nueve**. Archivarlo sin más dejaría la
guarda apuntando a `archive/`.

**Decisión**: se archiva, y la guarda se reapunta a la copia archivada, que sigue siendo verificable.
Las citas no dejan de ser ciertas por estar en `archive/`; lo que cambia es su estatus, no su
exactitud. Si algún día `docs-v2` incorpora una tabla de stack con citas, la guarda la seguirá allí.

## Conclusión

**La premisa del README de `docs-v2` es cierta para nueve de doce.** Los otros tres no tienen
equivalente y no se archivan — que es exactamente lo que este inventario existía para averiguar.

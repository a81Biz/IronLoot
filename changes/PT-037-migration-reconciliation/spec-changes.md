# PT-037 — Cambios de especificación

## Esquema / migraciones
- **+1 migración**: `<ts>_reconcile_backoffice_schema_and_currency`. Historial pasa de 14 → 15 migraciones.
- `schema.prisma`: **sin cambios** (ya es el estado objetivo; la migración lo alcanza).
- Tras PT-037, `prisma migrate deploy` reconstruye el esquema **completo** (28 tablas, 19 enums) en cualquier entorno.

## Reglas / hallazgos (docs-v2)
| Ref | Antes | Después (PT-037) |
|---|---|---|
| **AUD-001** | 11 tablas backoffice sin migración; `migrate deploy` incompleto | Reconciliado por la nueva migración idempotente |
| **AUD-008 / RN-27** | `payments.currency` default DB `USD` (esquema dice MXN) | Default DB `MXN` + backfill de filas `USD` |
| **ADR-006** | Migraciones versionadas (violado por `db push`) | Reafirmado: esquema solo vía `migrate`; `db push` solo prototipado |
| Modelo-de-Datos §4 | Drift documentado | Drift resuelto (pendiente merge) |

## Operación / despliegue
- `docs-v2/6-devops` checklist: el paso "esquema completo aplicado" deja de requerir `db push`; basta `migrate deploy`.
- Documentación a actualizar en STATE 7: `Modelo-de-Datos §4-5`, `Registro-de-Hallazgos` (AUD-001, AUD-008), `Catalogo-de-Reglas` RN-27, checklist DevOps.

## Sin cambios de contrato de API ni de comportamiento en runtime del entorno dev actual (cambio aditivo + normalización de datos).

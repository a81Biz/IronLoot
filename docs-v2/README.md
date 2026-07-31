# IronLoot — Documentación Oficial (docs-v2)

> **✅ REMEDIACIÓN COMPLETA Y FUSIONADA A MASTER (2026-07-23):** 36/36 hallazgos resueltos (código + doc), PTs 036–047, sin abiertos. AUD-016 cerrado como interruptor `CFDI_ENABLED` (la integración real del PAC queda como decisión de negocio a contratar). Ver [Informe-Remediacion.md](Informe-Remediacion.md). Verificación de entonces: API `tsc` 0 + 181 tests · core 134 · CLIENT/ADMIN builds OK. **Hoy (2026-07-30): 1383 unitarias en verde** — API **1130** en **138** suites · CORE **93** · CLIENT **144** · ADMIN 13 · BASE 3. *(CORE baja de 134 porque PT-191 retiró `Money` y el validador de IPN de PayPal: 41 casos verdes sobre código que no corría en producción.)*
>
> **Esta carpeta es la documentación oficial del producto.** Negocio, producto, arquitectura,
> ingeniería, QA, DevOps y UX.
>
> **Matiz de ADR-049 (2026-07-29), porque esta línea decía otra cosa.** Aquí se leía *«sustituye
> funcionalmente a `docs/enterprise-documentation/`»*, y esa afirmación era cierta para **nueve de
> doce** documentos, no para todos. Los nueve están archivados en
> `docs/enterprise-documentation/archive/` con un mapa documento a documento. Los otros tres **se
> conservan y no tienen equivalente aquí**: `11-Conventions.md` (las treinta `RULE-NN`, el contrato
> que un agente no puede romper), `10-Technical-Debt.md` (el registro `TD-XXX`) e `inventory/`.
>
> No es «uno gana»: son dos funciones que estaban mezcladas. Ésta describe el producto para personas;
> aquélla le dice a un agente qué no puede romper. `PTSA/` y `changes/` siguen intactos como insumo
> histórico y de evidencia.

| Metadato | Valor |
|---|---|
| **Generado** | 2026-07-23 |
| **Alcance** | Auditoría integral doc↔código de todo el repositorio IronLoot |
| **Método** | Reconstrucción basada en evidencia (Fases 1–5 de auditoría en `audit/`). Cada afirmación cita `archivo:línea`. En conflicto doc↔código, **gana el código**. |
| **Regla base** | Nada se inventa. Lo no verificable se marca como *"No determinado"* o se registra como hallazgo. |
| **Estado** | Reconstrucción en curso (por área, con checkpoint). |

## Cómo leer esta documentación

La documentación se organiza **por responsabilidad organizacional**, no por orden de escritura:

| Carpeta | Audiencia | Contenido |
|---|---|---|
| [`1-negocio/`](1-negocio/) | Dirección / Producto | BRD, PRD, objetivos, alcance, stakeholders, KPIs, roadmap, riesgos |
| [`2-producto/`](2-producto/) | Product Owner / BA | Casos de uso, historias, escenarios, matriz actor×caso, modelo funcional |
| [`3-arquitectura/`](3-arquitectura/) | Arquitectura | SAD, C4, DDD, bounded contexts, modelo de dominio, ADR |
| [`4-ingenieria/`](4-ingenieria/) | Ingeniería | SDD, modelo de datos, OpenAPI, migraciones, convenciones, integraciones |
| [`5-qa/`](5-qa/) | QA | Master Test Plan, matriz requisito×prueba, cobertura, defectos |
| [`6-devops/`](6-devops/) | DevOps / SRE | Despliegue, Docker, env, CI/CD, observabilidad, release |
| [`7-ux/`](7-ux/) | UX / Soporte | Manual de Usuario, Manual de Administrador, FAQ, flujos |
| [`transversal/`](transversal/) | Todos | **Fuentes únicas**: diccionario, reglas, dominio, casos de uso, trazabilidad, ADR, hallazgos |

## Fuentes únicas (transversal) — leer primero

Estos documentos son **canónicos**; el resto de la documentación los referencia y no los duplica:

- [Diccionario Maestro](transversal/Diccionario-Maestro.md) — todos los términos oficiales.
- [Catálogo Maestro de Reglas](transversal/Catalogo-Maestro-de-Reglas.md) — todas las reglas de negocio, una sola vez.
- [Modelo Maestro de Dominio](transversal/Modelo-Maestro-de-Dominio.md) — todas las entidades.
- [Catálogo Maestro de Casos de Uso](transversal/Catalogo-Maestro-de-Casos-de-Uso.md) — todos los casos.
- [Matriz Global de Trazabilidad](transversal/Matriz-Global-de-Trazabilidad.md) — regla→uso→entidad→servicio→endpoint→pantalla→prueba→manual.
- [Registro Maestro de ADR](transversal/Registro-Maestro-de-ADR.md) — decisiones arquitectónicas vigentes.
- [Registro de Hallazgos](transversal/Registro-de-Hallazgos.md) — inconsistencias no reconciliadas (estado real, 36 hallazgos).

## Convención de cabecera

Todo documento oficial de `docs-v2/` incluye una tabla de metadatos con: **Origen · Fuente · Fecha · Documentos usados · Código usado · Nivel de confianza**. Los niveles de confianza son:

- **Alto** — verificado directamente contra el código con cita `archivo:línea`.
- **Medio** — inferido de evidencia consistente pero no ejecutado en runtime.
- **Bajo / No determinado** — no verificable con los insumos actuales; registrado como hallazgo o pendiente.

> **Informe de cierre:** ver [Informe-Ejecutivo-Final.md](Informe-Ejecutivo-Final.md) — métricas de cobertura, inconsistencias resueltas, consolidaciones y trabajo pendiente.

## Estado de generación por área

| Área | Estado |
|---|---|
| transversal | ✅ completa |
| 1-negocio | ✅ completa |
| 2-producto | ✅ completa |
| 3-arquitectura | ✅ completa |
| 4-ingenieria | ✅ completa |
| 5-qa | ✅ completa |
| 6-devops | ✅ completa |
| 7-ux | ✅ completa |

## Advertencias críticas (ver Registro de Hallazgos)

El sistema documentado presenta **5 hallazgos CRÍTICOS** y **11 ALTOS** entre documentación y realidad. Los más importantes: drift de migraciones (~46% de modelos sin migración), flujo de puja no operable en la UI, comisión con doble mecanismo, y credenciales admin por defecto. Esta documentación describe el **estado real** (no el ideal); los hallazgos se corrigen luego bajo el marco FDGE.

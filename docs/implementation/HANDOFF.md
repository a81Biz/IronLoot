# HANDOFF — estado actual

**Fecha**: 2026-07-28
**Rama**: `master` — todo fusionado, **cero ramas sin fusionar**, árbol limpio.

**Pruebas**: **919/919** unitarias (API 666 · CORE 134 · CLIENT 103 · ADMIN 13 · BASE 3) ·
**77 e2e (16/16 suites)** · **136 por navegador** (Playwright sobre el stack real) ·
`lint` 0 errores · `npm audit --omit=dev` = 0 en los cinco proyectos.

**Plataforma**: NestJS **11.1.28** · Express **5.2.1** · path-to-regexp **8.4.2** en los cuatro
servicios (API, BASE, CLIENT, ADMIN).

**PTSA**: Clase **A** · Health **95.5** · Risk **24** CONTROLADO · Confidence **95.0** · FRESH.
**Un solo hallazgo activo en todo el sistema: H-005.**

---

## Lo último: el camino al despliegue, recorrido entero

La auditoría S-002 encontró que **nadie lo había recorrido nunca**. Esquema, pipeline e imagen
estaban rotos los tres, y ninguna de las nueve sesiones anteriores lo había visto porque
`.github/workflows/`, `src/api/scripts/` y los `Dockerfile` **no estaban en el alcance auditable**.

| PT | Qué | Mecanismo que deja |
|---|---|---|
| **PT-127** | Las 23 migraciones **nunca se habían ejecutado** y no reproducían el esquema — `payments.reference` perdía su unicidad | `audit:schema` en CI, **sin `needs`** |
| **PT-128** | El job de integración no podía terminar: base sin esquema **y** dos clientes Redis fuera del ciclo de vida de Nest | El job aplica con `migrate deploy` · checkpoint D3 en CI |
| **PT-129** | La imagen de producción no arrancaba — **seis bloqueos apilados**, y el healthcheck roto que motivó el hallazgo era el séptimo | `healthcheck-apunta-a-ruta-real.spec.ts` · tres imágenes nuevas |
| **PT-130** | Las **cinco** citas de la tabla de stack del TRD apuntaban a la línea equivocada | `coherencia-documentacion-codigo.spec.ts` |
| **PT-131** | 42 de 80 e2e probaban un contrato de hace meses — **once capas** de sedimento | `auction-helper` + su spec contra el DTO real |
| **PT-132** | Un `PATCH` parcial **borraba ajustes en silencio** · la página «Configuración» no cargaba para nadie | `ajustes-parciales.spec.ts` · `rutas-que-el-client-invoca.spec.ts` |
| **PT-133** | Dos endpoints de pago sin llamantes; uno **acreditaba dinero** | `endpoints-legados-retirados.spec.ts` · **ADR-047** |
| **PT-134** | Validación por navegador | 127 + 9 comprobaciones, 0 fallos |

Siete hallazgos **cerrados** con VoBo humano tras validar por navegador: H-014 … H-020.

---

## Lo único que bloquea, y no es técnico

### H-005 — quién emite la factura

Mantiene D1 en 85 y bloquea P-012 (`CfdiRecord`, sin instancias). **Ningún PT puede resolverlo**:
es una decisión de negocio y fiscal.

Las tres opciones, con lo que exige cada una, están en `PTSA/Fases/F-1_Declaracion_Valor.md`
§ U-005. Con la decisión tomada: se amplía `CfdiData`, se capturan los datos fiscales, se contrata
el PAC, y P-012 pasa a existir.

---

## Riesgos y deuda abiertos

| | Qué |
|---|---|
| **TD-016** | **Nada comprueba las vulnerabilidades de la imagen base.** `audit:check` mira npm; los avisos de `node:20-alpine` no los recoge ningún control |
| | La guarda del contrato SSR↔API cubre **sólo el CLIENT**; faltan ADMIN y BASE |
| | La suite QA corre sobre **HTTP**: lo que dependa de origen seguro (COOP, cookies `Secure`) no queda ejercido |
| | ¿Más servicios que mezclen un DTO transformado contra JSON almacenado? El patrón de H-019 podría repetirse |
| | `ironloot_db` es a la vez base de desarrollo **y** dato que sostiene validaciones PTSA — y `run-all.sh` la trunca |
| | ADMIN sin `favicon.ico`; sale en la consola de todas sus pantallas |
| **NUEVO** | **La pantalla «Conciliación» de ADMIN no tiene JavaScript**: `reconciliation.html:2` mete el `<script>` dentro de `{% block title %}`, bloque que `layouts/admin.html` no declara — Nunjucks lo descarta en silencio. El botón «Conciliar» está muerto |
| **NUEVO** | **El modal «+ Crear reembolso» de ADMIN no abre**: `refunds.html` usa atributos `data-bs-*` y **no hay Bootstrap en ningún sitio de ADMIN** |

---

## Lo que hay que saber antes de tocar nada

1. **Editar `schema.prisma` exige generar migración.** El contenedor aplica con `migrate deploy` y,
   si falla, **no arranca**. El atajo (`db push`) es lo que produjo H-014. → RULE-10
2. **`src/api/scripts/` no está montado como volumen.** Cambiar el entrypoint exige
   `docker-compose build api`; si no, el contenedor sigue con la copia de la imagen. **Estuve a
   punto de cerrar PT-127 afirmando algo falso por esto** — lo detecté leyendo el log, no el fichero.
3. **Antes de tocar un endpoint, buscar sus llamantes en todo `src/`** — incluido el JavaScript de
   navegador, donde vive media superficie del contrato. → RULE-13
4. **Toda guarda se prueba en los dos sentidos.** Tres se acusaron a sí mismas antes de servir de
   algo. → RULE-14
5. **`run-all.sh` trunca la base de datos.** Copia antes si contiene salida real de una validación.
6. **Consultar `docs-v2/` ANTES de diagnosticar.** Diagnosticar desde el sistema en marcha me hizo
   encuadrar H-018 como defecto crítico de un producto CRÍTICO cuando era un endpoint legado que
   nadie invoca. FDGE lo exige por algo.

---

## Próximas acciones recomendadas

1. **Decidir H-005.** Es lo único que separa al sistema de tener cero hallazgos abiertos.
2. **TD-016** — un escáner de imagen en el pipeline, **contra línea base y no contra umbral**: un
   umbral pone el CI rojo desde el primer día y así es como muere un control (lección de PT-118).
3. **Ampliar la guarda de rutas a ADMIN y BASE.** Barata, y en el CLIENT encontró un defecto real a
   la primera.
4. **Comprobar en un push real que `build` y `docker` se ejecutan.** Nunca lo han hecho; ahora
   deberían, y conviene verlo con los propios ojos antes de darlo por bueno.
5. **Los dos defectos de ADMIN que destapó el grafo** (PTSA `PENDIENTES.md` § S-002-G, filas 9 y 10)
   — y con ellos la guarda que los caza de raíz: **todo `{% block %}` de una plantilla tiene que
   existir en su layout**. Es la misma familia que F-34: un `<script>` mal colocado se queda muerto
   años con la suite entera en verde.

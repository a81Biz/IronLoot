# PT-141 — Cambios de especificación

## ADR-049 — `docs-v2/` es la documentación oficial

En `docs-v2/transversal/Registro-Maestro-de-ADR.md` (último: ADR-048, de PT-135):

> **ADR-049 — Una sola documentación oficial** · 2026-07-28
>
> **Contexto.** Dos árboles se declaraban mutuamente sustitutos: `docs/enterprise-documentation/`
> (Foundation Protocol, 23-jun) decía de sí mismo *«toca regenerar»*, y `docs-v2/` (23-jul) se
> declaraba *«la única fuente de verdad»*. `CLAUDE.md` citaba el primero **10 veces**, todas
> vinculantes, y el segundo **una**. Cada PT escribía en los dos (`6decb1a`, `4f40358`).
>
> **Decisión.** `docs-v2/` es la documentación oficial del producto.
> `docs/enterprise-documentation/` queda como **contrato de agente**, acotado a `11-Conventions.md`,
> `10-Technical-Debt.md` e `inventory/`. `01`…`09` se archivan con un mapa de destinos.
>
> **Consecuencias.** Se acaba la doble escritura. `CLAUDE.md` nombra cada árbol con su función. La
> regeneración de Foundation (`[START FOUNDATION]`) queda acotada al contrato de agente y se ejecuta
> **después** de cerrar PT-136…139: regenerar antes documentaría defectos conocidos como diseño.

## `CLAUDE.md` — las 10 citas vinculantes

| Línea | Contexto | Cambio |
|---|---|---|
| `:329, :354, :368, :379` | Foundation Protocol | Alcance reducido al contrato de agente |
| `:428` | Jerarquía de consulta ante incertidumbre | `docs-v2/` primero; `11-Conventions.md` para el contrato |
| `:487, :513, :536` | Fuentes obligatorias de STATE 1-B / 1-E / 1-R | Ambos árboles, con su función |
| `:664` | Fuentes obligatorias antes de estrategia | Ídem |
| `:676` | «No Foundation Skip» | Sigue **impidiendo** trabajar sin documentación verificada |

**Ninguna de las reglas pierde fuerza.** «No Architecture Blindness» y «No Foundation Skip» siguen
obligando a consultar arquitectura antes de tocar código; cambia dónde está, no si es obligatorio.

## `CLAUDE.md` — las dos citas rotas

| Línea | Antes | Después |
|---|---|---|
| `:735` | *«El manual operativo vive en `PTSA/Motor-PTSA.md`; el protocolo en `PTSA/PTSA.md`»* | La autoridad es `docs/methodology/PTSA/PTSA-V3-Especificacion-Oficial.md` |
| `:840` | *«Para el manual completo ver `PTSA/Motor-PTSA.md`»* | Ídem |

**Ninguno de los dos ficheros ha existido nunca.** Pendiente desde DS-004, repetido cinco veces en
`PENDIENTES.md`, cuatro sesiones PTSA.

## `docs/enterprise-documentation/`

| Documento | Destino |
|---|---|
| `11-Conventions.md` | **Se conserva y se regenera** (141.B) — veinte RULE |
| `10-Technical-Debt.md` | **Se conserva y se regenera** — guarda de PT-103 |
| `inventory/` (6 ficheros) | **Se conserva y se regenera** |
| `01`…`09` | `archive/`, con `README.md` que mapea cada uno a su destino en `docs-v2/` |
| `README.md` | Reescrito: alcance reducido, fecha, y por qué existe |

## `10-Technical-Debt.md:100-105` — corrección de prosa

| Antes | Después |
|---|---|
| TD-005 «CERRADA DEL TODO … `style-src` por PT-105» **y catorce líneas después** «**Queda `styleSrc`**, que sigue llevándolo … registrado aparte como **TD-014**» | Sin la contradicción. `styleSrc` no lleva `'unsafe-inline'` desde PT-105 y TD-014 está cerrada (`:289-292`) |

**Ninguna guarda lo cazaba**: es prosa. PT-140 decidió a conciencia no escribir una que lo hiciera.

## `PTSA/PENDIENTES.md`

El pendiente *«`CLAUDE.md` cita `PTSA/Motor-PTSA.md` y `PTSA/PTSA.md`; ninguno existe»`* queda
**resuelto** tras cuatro sesiones.

## Nueva regla de convenciones

`11-Conventions.md` — **RULE-21**:

> **Hay una documentación oficial, y toda ruta citada en `CLAUDE.md` apunta a un fichero que existe.**
> Este repositorio tuvo dos árboles declarándose mutuamente sustitutos durante cinco semanas, con
> `CLAUDE.md` obligando al que decía de sí mismo *«toca regenerar»* y cada PT pagando doble escritura
> (PT-141, ADR-049). Y llevaba cuatro sesiones PTSA citando dos ficheros que no existen.
> Es la misma familia que H-016: **un documento sin citas se lee con desconfianza; uno con citas rotas
> se lee con confianza y es falso.**

## Lo que este PT NO especifica

- Ningún cambio en `src/`, en la API, en datos ni en comportamiento observable.
- El contenido de `docs-v2/`: se decide su estatus, no su exactitud.
- `docs/methodology/`, `PTSA/`, `changes/` y `docs/implementation/` no se tocan.

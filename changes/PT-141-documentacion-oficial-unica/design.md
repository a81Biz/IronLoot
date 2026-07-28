# PT-141 — Design: una sola documentación oficial

**Tipo**: REFACTOR · **Complejidad**: MAJOR · **Origen**: decisión del humano, 2026-07-28
**Se parte en dos**: **141.A** (la decisión, ahora) · **141.B** (regenerar Foundation, después de
PT-136…139)

## La decisión, ya tomada

**`docs-v2/` es la fuente de verdad.**

## El problema que resuelve

Dos árboles se declaran mutuamente sustitutos, y `CLAUDE.md` —el documento que gobierna a todo agente
que toque este repositorio— **obliga al contrario del que se declara oficial**:

| | `docs/enterprise-documentation/` | `docs-v2/` |
|---|---|---|
| Qué dice de sí mismo | *«un recorrido del 23-jun con correcciones encima, no una regeneración. **Toca regenerar. Decisión del humano**»* (`README.md:8-15`) | *«Esta carpeta es la **única fuente de verdad** del proyecto. **Sustituye funcionalmente** a `docs/enterprise-documentation/`»* (`README.md:5`) |
| Generado | 2026-06-23 | 2026-07-23 |
| Ficheros | 12 + `inventory/` | 31 |
| Citado en `CLAUDE.md` | **10 veces**, todas vinculantes | **1 vez** |

**Y el coste es recurrente, no teórico.** Los commits `6decb1a` y `4f40358` —*«la segunda escritura,
en todos los documentos que la debían»*— escriben en los **dos** árboles. Cada PT paga doble. La
divergencia es cuestión de tiempo, y H-016 ya demostró qué pasa entonces: una cita precisa que se
desplaza **se lee con confianza y es falsa**.

## Decisiones de arquitectura

### D1 — `docs-v2/` es la documentación oficial; `enterprise-documentation/` es el contrato de agente

No es «uno gana y el otro se borra». Son dos funciones distintas que hoy están mezcladas:

| Función | Dónde vive | Quién la lee |
|---|---|---|
| **Documentación del producto** — negocio, producto, arquitectura, QA, devops, UX | `docs-v2/` | Personas |
| **Contrato de agente** — cómo operar sobre este código sin romperlo | `docs/enterprise-documentation/`, acotado | Agentes |

`enterprise-documentation/` queda reducido a lo que sólo él aporta y ningún documento de `docs-v2/`
cubre:

- **`11-Conventions.md`** — las `RULE-NN`. Es el contrato operativo, y Foundation Protocol lo llama
  «el output más crítico». Tras estos seis PT tendrá **veinte reglas**.
- **`10-Technical-Debt.md`** — el registro `TD-XXX`, al que apunta la guarda de PT-103.
- **`inventory/`** — los seis inventarios derivables del código.

`01`…`09` se archivan bajo `enterprise-documentation/archive/`, **con una nota que diga a qué
documento de `docs-v2/` ha ido cada uno**. Archivar sin el mapa convierte el archivo en un cementerio.

### D2 — `CLAUDE.md` se reescribe donde miente por omisión

Las 10 citas vinculantes (Foundation Protocol, fuentes obligatorias de FDGE en las tres variantes de
STATE 1, STATE 2, «No Architecture Blindness», «No Foundation Skip») pasan a nombrar los dos árboles
con su función.

**Matiz que no puede perderse**: la regla «No Foundation Skip» existe para que ningún agente diseñe
sobre suposiciones. Reapuntarla mal la desactivaría. La redacción nueva tiene que seguir obligando a
consultar arquitectura **antes** de tocar código; sólo cambia dónde está.

### D3 — Las dos citas rotas de `CLAUDE.md` se resuelven aquí

```
CLAUDE.md:735   «El manual operativo vive en `PTSA/Motor-PTSA.md`; el protocolo en `PTSA/PTSA.md`»
CLAUDE.md:840   «Para el manual completo ver `PTSA/Motor-PTSA.md`»

$ ls PTSA/Motor-PTSA.md PTSA/PTSA.md   ->  ninguno de los dos existe
```

Pendiente desde **DS-004** — cuatro sesiones PTSA, repetido cinco veces en `PENDIENTES.md`. Es la
misma clase de defecto que H-016: **un documento con citas rotas se lee con confianza y es falso.**

Dos salidas: se escriben, o se retira la cita y `docs/methodology/PTSA/PTSA-V3-Especificacion-Oficial.md`
—que sí existe— queda como única autoridad. **Recomendación: retirar la cita.** Escribir dos
documentos para justificar dos referencias es al revés.

### D4 — La contradicción de `10-Technical-Debt.md` se corrige a mano

```
:100   TD-005 — Status: CERRADA DEL TODO ... `style-src` por PT-105 (que cerro TD-014)
:103   **Queda `styleSrc`**, que sigue llevandolo por los estilos inline de las plantillas:
:104   registrado aparte como **TD-014**
:289   TD-014 — Status: CERRADA 2026-07-27 por PT-105
```

El párrafo se contradice consigo mismo catorce líneas más abajo y con TD-014 doscientas después. Es
un resto de la redacción anterior al cierre de TD-014. **Ninguna guarda lo caza porque es prosa**, y
PT-140 decidió a conciencia no escribir una que lo hiciera.

### D5 — La regeneración va **después** (PT-141.B)

`[START FOUNDATION]` produce un snapshot. Ejecutarlo hoy documentaría, como si fueran diseño:

- un CI que no se ejecuta (PT-136),
- un contrato de Redis que sólo funciona por un fichero fuera de git (PT-137),
- ocho guardas que no corren donde la propia regla dice que se ejecuta npm (PT-138),
- dos pantallas de ADMIN con controles muertos (PT-139).

Foundation Protocol dice que lo no verificable se registra en `10-Technical-Debt.md`, no que se
documente como estado deseado. Regenerar antes de cerrarlos convertiría cuatro defectos en cuatro
líneas de arquitectura.

## El riesgo principal

**R6 — romper las citas que vigila `coherencia-documentacion-codigo.spec.ts`** (PT-130, H-016). Mover
documentos desplaza líneas. Las dos guardas documentales se ejecutan **antes y después** de cada
movimiento, y si las citas que vigilaban se mudan a `docs-v2/`, la guarda se amplía con ellas.

H-016 volvería **con aval** si esto se hace sin cuidado: un documento sin citas se lee con
desconfianza; uno con citas rotas se lee con confianza y es falso.

## Lo que este PT NO decide

- **No audita el contenido de `docs-v2/`.** Decide su estatus, no su exactitud.
- **No toca `docs/methodology/`**: es la autoridad de los cuatro frameworks y `CLAUDE.md` depende
  de ella.
- **No toca `PTSA/`, `changes/` ni `docs/implementation/`**: son evidencia e historia.
- **Nada de `src/`.**

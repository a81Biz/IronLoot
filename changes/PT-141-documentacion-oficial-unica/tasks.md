# PT-141 — Tareas atómicas

**141.A** — sin prerequisitos. Puede ir **en paralelo a PT-136**: no comparte ficheros y detiene la
doble escritura documental que hoy paga cada PT.
**141.B** — requiere PT-136, PT-137, PT-138 y PT-139 **cerrados**.
Ninguna empieza antes del ACK del Proposal Gate.

---

# PT-141.A — La decisión

## PT-141.A.1 — Línea base de las dos guardas documentales

- **Objetivo**: R6. Saber qué vigilan **antes** de mover nada.
- **Entrada**: `coherencia-documentacion-codigo.spec.ts`, `coherencia-deuda-tecnica.spec.ts`.
- **Salida**: lista de cada cita `fichero:línea` que vigilan y en qué documento vive.
- **Validación**: las dos en verde, capturado. Es la referencia contra la que se compara después.
- **Status**: PENDING

## PT-141.A.2 — Inventario de solapamiento

- **Objetivo**: saber qué cubre `docs-v2/` y qué sólo cubre `enterprise-documentation/`.
- **Entrada**: los 12 + `inventory/` frente a los 31 de `docs-v2/`.
- **Salida**: tabla `documento | equivalente en docs-v2 | decisión (archivar / conservar)`.
- **Validación**: **ningún documento sin equivalente queda archivado**. Si `01`…`09` tienen contenido
  que `docs-v2/` no cubre, se dice — no se asume la premisa del README.
- **Status**: PENDING

## PT-141.A.3 — ADR-049

- **Objetivo**: que la decisión exista donde se buscan las decisiones.
- **Entrada**: `docs-v2/transversal/Registro-Maestro-de-ADR.md` (último: ADR-048, de PT-135).
- **Salida**: ADR-049 — `docs-v2/` es la documentación oficial; `enterprise-documentation/` queda como
  contrato de agente, acotado a `11-Conventions.md`, `10-Technical-Debt.md` e `inventory/`. Con el
  motivo: dos árboles que se declaraban mutuamente sustitutos y **cada PT pagando doble escritura**.
- **Validación**: la decisión se puede leer sin este paquete de propuesta delante.
- **Status**: PENDING

## PT-141.A.4 — `CLAUDE.md`: las 10 citas

- **Objetivo**: D2.
- **Entrada**: `:329, :354, :368, :379, :428, :487, :513, :536, :664, :676`.
- **Salida**: cada una nombra el árbol correcto con su función.
- **Validación**: **«No Architecture Blindness» y «No Foundation Skip» siguen obligando** a consultar
  arquitectura antes de tocar código. Sólo cambia dónde está. Reapuntarlas mal las desactivaría, y
  ése es el riesgo real de esta tarea.
- **Status**: PENDING

## PT-141.A.5 — Las dos citas rotas

- **Objetivo**: D3. Pendiente desde DS-004 — **cuatro sesiones**.
- **Entrada**: `CLAUDE.md:735` y `:840` citan `PTSA/Motor-PTSA.md` y `PTSA/PTSA.md`; **ninguno existe**.
- **Salida**: retiradas, dejando `docs/methodology/PTSA/PTSA-V3-Especificacion-Oficial.md` —que sí
  existe— como única autoridad. Si el humano prefiere escribirlos, se escriben.
- **Validación**: barrido automático — **ninguna ruta citada en `CLAUDE.md` apunta a un fichero
  inexistente**. Hoy fallan dos.
- **Status**: PENDING

## PT-141.A.6 — La contradicción de TD-005

- **Objetivo**: D4.
- **Entrada**: `10-Technical-Debt.md:100-105` frente a `:289-292`.
- **Salida**: el párrafo corregido. `styleSrc` **no** lleva `'unsafe-inline'` desde PT-105; TD-014
  está cerrada.
- **Validación**: `coherencia-deuda-tecnica.spec.ts` en verde. Ninguna guarda podía cazar esto: **es
  prosa**, y PT-140 decidió a conciencia no escribir una que lo hiciera.
- **Status**: PENDING

## PT-141.A.7 — Archivar `01`…`09` **con su mapa**

- **Objetivo**: D1.
- **Entrada**: PT-141.A.2.
- **Salida**: `enterprise-documentation/archive/` con los nueve y un `README.md` que diga, **documento
  a documento**, a cuál de `docs-v2/` ha ido. Archivar sin el mapa convierte el archivo en un
  cementerio.
- **Validación**: `grep -rn` de cada nombre archivado en todo el repositorio — **ninguna referencia
  colgando**.
- **Status**: PENDING

## PT-141.A.8 — `enterprise-documentation/README.md` reescrito

- **Objetivo**: que deje de anunciar doce documentos que ya no están.
- **Salida**: alcance reducido declarado, fecha, y por qué existe (contrato de agente).
- **Validación**: coherente con ADR-049.
- **Status**: PENDING

## PT-141.A.9 — Las dos guardas, después

- **Objetivo**: R6.
- **Entrada**: PT-141.A.1.
- **Salida**: las dos en verde. Si las citas que vigilaban se mudaron a `docs-v2/`, **la guarda se
  amplía con ellas**.
- **Validación**: ninguna cita perdida respecto a la línea base. **H-016 volvería con aval si esto se
  hace sin cuidado.**
- **Status**: PENDING

## PT-141.A.10 — Registro de 141.A

- **Salida**: `HISTORY.log` + `HANDOFF.md` + `evidence/PT-141/`. `PTSA/PENDIENTES.md`: el pendiente de
  `Motor-PTSA.md`, resuelto tras cuatro sesiones.
- **Status**: PENDING

---

# PT-141.B — La regeneración

## PT-141.B.1 — Verificar que los cuatro están cerrados

- **Objetivo**: D5. Un snapshot no debe documentar defectos conocidos como diseño.
- **Entrada**: PT-136, PT-137, PT-138, PT-139.
- **Salida**: los cuatro con evidencia y entrada en `HISTORY.log`.
- **Validación**: `coherencia-de-registros.spec.ts` (PT-140) en verde. **Si alguno sigue abierto,
  141.B no empieza.**
- **Status**: BLOCKED — por PT-136…139

## PT-141.B.2 — `[START FOUNDATION]` acotado

- **Objetivo**: regenerar el contrato de agente contra el código de hoy.
- **Entrada**: alcance `src/` + `docker-compose.yml` + `schema.prisma` + `.github/workflows/`.
- **Salida**: `11-Conventions.md` (con las **veinte** RULE), `10-Technical-Debt.md` e `inventory/`.
- **Validación**: cada afirmación con cita `fichero:línea` verificable. Lo no citable va a
  `10-Technical-Debt.md` como «no determinado», **nunca se inventa**.
- **Status**: BLOCKED

## PT-141.B.3 — Las guardas sobre el resultado

- **Salida**: las tres documentales en verde contra los documentos regenerados.
- **Validación**: **ninguna cita rota**. Es la prueba de que la regeneración no reintrodujo H-016.
- **Status**: BLOCKED

## PT-141.B.4 — ACK humano de Foundation

- **Objetivo**: Foundation Protocol sólo está completo con `[FOUNDATION VALIDATED]`.
- **Salida**: petición al humano con las discrepancias encontradas, que son candidatas a
  `10-Technical-Debt.md`.
- **Validación**: **el agente no lo cierra.**
- **Status**: BLOCKED

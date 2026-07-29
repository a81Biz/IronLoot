# ROADMAP — FPGE

**Emisión:** R-002 · **2026-07-29** · **Sesión PTSA origen:** S-002-V (2026-07-28)
**Estado:** todos los ítems en `PROPUESTO`. FPGE propone; **el humano dispone**.

> La emisión anterior (R-001, del 2026-06-23) se promovió entera a PT-026…PT-032 y luego se **retiró
> como documento vivo** en PT-140, porque llevaba cinco semanas diciendo algo que había dejado de ser
> cierto. Está en `archive/ROADMAP-R-001-2026-06-23.md`. Los identificadores `R-001`…`R-007` están
> consumidos: esta corrida empieza en **R-008**.

---

## ⚠ Compuerta de frescura — léela antes que el orden

**`score_freshness` es STALE.** El último registro de `score-history.json` (S-002-V, 2026-07-28) se
emitió con `commits_since_audit: 0`. Desde entonces:

```
$ git log --oneline --since=2026-07-28 | wc -l           →  91 commits
$ git log --since=2026-07-28 --name-only … | grep ^src/  →  72 ficheros bajo src/
```

**Once PT fusionados** (PT-136…PT-147) que tocaron el pipeline, Redis, el monedero, la concurrencia
del saldo, las imágenes y la documentación. Los scores vigentes —Health **95.5**, Risk **24**, Clase
**A**— **no han visto nada de eso**.

FPGE emite igualmente, porque la evidencia de cada ítem se verificó una a una contra el código de hoy
(cada ítem lleva su línea de «Verificación»). Pero **el orden no debe tratarse como definitivo hasta
un `resume PTSA`**: una corrida delta puede abrir hallazgos nuevos que desplacen todo lo de abajo, y
puede además mover D2 —los once PT corrigieron defectos reales— lo que cambia los `ScoreImpact`.

**Acción previa recomendada: `resume PTSA` (delta sync).** No es un ítem del roadmap: es trabajo de
auditoría, no de FDGE, y promoverlo a un PT sería un error de categoría.

---

## Lectura rápida

### Top-3 por impacto (`delta_score`)

| # | Ítem | Δ Health | Nota |
|---|---|---|---|
| 1 | **R-010** — H-005, quién emite la factura | **+4.5 real** | El único que **retira** una penalización activa. Los demás la **evitan** |
| 2 | **R-009** — la guarda SSR↔API a ADMIN y BASE | +4.5 evitado | Impide la reaparición de un ALTA ya demostrado real |
| 3 | **R-008** — TD-016, escáner de la imagen base | +4.5 evitado | Hoy nadie mide esa superficie |

### Top-3 quick wins (esfuerzo `S`, mayor prioridad)

| # | Ítem | Priority | Por qué es barato |
|---|---|---|---|
| 1 | **R-009** | **121.50** | La guarda existe; se le añaden dos raíces de ruta |
| 2 | **R-008** | **40.50** | Las imágenes ya se construyen en CI desde PT-147 |
| 3 | **R-013** | **27.00** | Es un barrido, no una corrección |

**R-009 está en las dos listas.** Es el ítem obvio de esta emisión: máximo impacto evitado, coste
mínimo, y evidencia de que el defecto que previene ya ocurrió de verdad.

---

## Orden priorizado

| Rank | ID | Tipo | Título | Origen | Dim | Δ Score | Esf. | **Priority** | Estado |
|---:|---|---|---|---|:--:|---:|:--:|---:|---|
| 1 | **R-009** | REFACTOR | Extender la guarda del contrato SSR↔API a ADMIN y BASE | H-020 | D1 | +4.5 | S | **121.50** | `PROPUESTO` |
| 2 | **R-008** | FEATURE | Escáner de vulnerabilidades de la **imagen base** en CI | TD-016 · PENDIENTES #1 | D2 | +4.5 | S | **40.50** | `PROPUESTO` |
| 3 | **R-013** | INVESTIGATION | Barrer el patrón de H-019: DTO transformado contra JSON almacenado | H-019 · PENDIENTES #4 | D2 | +1.5 | S | **27.00** | `PROPUESTO` |
| 4 | **R-012** | BUG | La evidencia que los documentos citan no está en git (F-136-A) | F-136-A · H-016 | D4 | +1.5 | S | **20.25** | `PROPUESTO` |
| 5 | **R-010** | INVESTIGATION | **H-005** — quién emite la factura (CFDI/PAC) | H-005 (ABIERTA) | D1 | +4.5 | L | **15.19** | `PROPUESTO` |
| 6 | **R-011** | REFACTOR | Un mecanismo que impida que `[START FOUNDATION]` deshaga ADR-049 | PT-141 self-review · HANDOFF | D4 | +1.5 | S | **13.50** | `PROPUESTO` |
| 7 | **R-017** | FEATURE | `/users/:id/ratings` exige sesión; la reputación se mira **antes** de registrarse | S-002-V · PENDIENTES #5 | D1 | +1.5 | S | **9.00** | `PROPUESTO` |
| 8 | **R-016** | REFACTOR | La suite QA por navegador corre sobre HTTP | S-002-V · PENDIENTES #3 | D2 | +1.5 | M | **3.00** | `PROPUESTO` |
| 9 | **R-018** | BUG | La suite del API no cabe en el contenedor con los workers por defecto | HANDOFF (medido 29-jul) | D2 | +0.3 | S | **1.20** | `PROPUESTO` |
| 10 | **R-014** | REFACTOR | `pages-moderation.js` usa `style.display` — el patrón contra el que avisa RULE-19 | PT-139 | D2 | +0.3 | S | **1.20** | `PROPUESTO` |
| 11 | **R-015** | REFACTOR | La imagen de producción del API se lleva dependencias de desarrollo | S-002 | D2 | +0.3 | M | **0.60** | `PROPUESTO` |

Desempate R-018 / R-014 (ambos 1.20, ambos D2): **mayor riesgo de no hacerlo**. Una suite que reporta
«4 failed» sin que nada esté roto es cómo se acaba ignorando un fallo verdadero; el `style.display`
de moderación funciona hoy.

---

## Los ítems, con su racional

### R-009 · REFACTOR · Priority 121.50 · Esfuerzo S · D1

**Extender `rutas-que-el-client-invoca.spec.ts` a ADMIN y BASE.**

`Priority = (12 × 4.5 × 1.5 × 1.5) / 1 = 121.50`

- **Origen:** H-020 (CERRADA, D1, ALTA, I=3 × P=4 = **12**) y `PTSA/PENDIENTES.md` «falta medir» #2.
- **Verificación (2026-07-29):** la guarda lee **sólo** `src/apps/client/src` y
  `src/apps/client/public/js`. ADMIN y BASE no están cubiertos.
- **Racional:** H-020 no fue teórico. El CLIENT pedía `/api/v1/users/settings`, que no existe: caía en
  el comodín `@Get(':id')`, el `ParseUUIDPipe` rechazaba la cadena y devolvía **400 «uuid inválido»**.
  La página «Configuración» no cargaba **para nadie**, y el mensaje mandaba a mirar el identificador.
  La guarda que se escribió para que no volviera a pasar cubre uno de los tres SSR.
- **Riesgo de no hacerlo:** el mismo fallo en ADMIN o BASE, con el mismo síntoma engañoso y sin nada
  que lo cace. `DomainMultiplier` 1.5 porque una página que no carga para nadie es un fallo de
  producto, no de código.

### R-008 · FEATURE · Priority 40.50 · Esfuerzo S · D2

**Medir vulnerabilidades de la imagen base en CI.**

`Priority = (6 × 4.5 × 1.5 × 1.0) / 1 = 40.50`

- **Origen:** TD-016 (`10-Technical-Debt.md`, ABIERTA), `PENDIENTES` #1, `HANDOFF`.
- **Verificación:** `npm run audit:check` compara contra `security-baseline.json` — **paquetes npm**.
  Nada mira la imagen base.
- **Racional:** es una superficie de producción que **nadie ha medido nunca**. No es que salga verde:
  es que no se mira. Y desde PT-147 las cuatro imágenes se construyen en CI, así que el escaneo es
  añadir un paso a un job que ya existe y ya tiene la imagen delante.
- **Riesgo de no hacerlo:** una CVE de la imagen base es indistinguible de «no hay CVE» mientras el
  control no exista. Es la forma de *un mecanismo que no se ejecuta no avisa de nada* (RULE-26)
  aplicada a algo que ni siquiera se ha escrito.

### R-013 · INVESTIGATION · Priority 27.00 · Esfuerzo S · D2

**¿Hay más servicios que mezclen un DTO transformado contra un JSON almacenado?**

`Priority = (12 × 1.5 × 1.5 × 1.0) / 1 = 27.00`

- **Origen:** H-019 (CERRADA, D2, ALTA, I=3 × P=4 = **12**), `PENDIENTES` #4.
- **Verificación:** un primer barrido de `deepMerge` en `src/api/src/modules/**/*.service.ts` sólo
  devuelve `users.service.ts` — el ya corregido. **`ScoreImpact` se rebaja a MEDIA (5 × 0.30 = 1.5)
  por eso**: el rendimiento esperado es bajo, y decirlo aquí es más útil que inflar el número.
- **Racional:** el defecto de H-019 no está en `deepMerge`, está en la combinación — con
  `transform: true` al servicio no le llega un objeto plano sino una **instancia con todas las
  propiedades declaradas**, las ausentes como `undefined`. Así que el barrido correcto no busca una
  función: busca **cualquier escritura a una columna `Json` a partir de un DTO**. Eso es más que un
  `grep`, y por eso es INVESTIGATION.
- **Riesgo de no hacerlo:** otro `PATCH` parcial borrando ramas que el cliente no mandó, en silencio y
  con 200.

### R-012 · BUG · Priority 20.25 · Esfuerzo S · D4

**Los documentos citan evidencia que no está en el repositorio.**

`Priority = (9 × 1.5 × 1.5 × 1.0) / 1 = 20.25`

- **Origen:** F-136-A; mecanismo idéntico a H-016 (D4, ALTA, I=3 × P=3 = **9**).
- **Verificación (2026-07-29):** **181** ficheros en `docs/implementation/evidence/`, **100** seguidos
  por git → **81 sin seguir**. Cuando se registró eran 79 de 162. **Ha empeorado**, y de ahí el `+0.5`
  de urgencia por regresión.
- **Racional:** un documento que cita evidencia inexistente se lee con confianza y es falso — es H-016
  literal. `PENDING_TASKS` llegó a mandar leer un `regresion.txt` que no está.
- **Riesgo de no hacerlo:** cada PT nuevo añade evidencia y la proporción sin seguir crece. La
  decisión de fondo es barata pero es una decisión: **qué evidencia pertenece al repositorio**.

### R-010 · INVESTIGATION · Priority 15.19 · Esfuerzo L · D1

**H-005 — quién emite la factura.**

`Priority = (6 × 4.5 × 1.5 × 1.5) / 4 = 15.19`

- **Origen:** H-005, **el único hallazgo activo de todo el sistema** (D1, ALTA, I=2 × P=3 = 6,
  penalización 15). Detectado el 2026-06-23; `audit_due` a 60 días → **2026-08-22, aún no vencido**,
  por eso la urgencia no lleva ese `+0.5`.
- **Es el único ítem cuyo `delta_score` es real y no evitado:** cerrarlo sube D1 de 85 a 100 y el
  Health en +4.5 de verdad.
- **Advertencia, y es la que importa:** `PTSA/PENDIENTES.md` lo dice sin rodeos — *«Ningún PT puede
  resolverlo»*. Requiere **contratar un PAC certificado ante el SAT** y **decidir quién emite la
  factura** (tres opciones en `F-1 § U-005`). Promoverlo a FDGE produciría un PT que no puede
  terminar. **Lo que hace falta es la decisión, no el ticket.** Una vez tomada, el trabajo técnico sí
  es promovible, y entonces desbloquea P-012 (`CfdiRecord`), el único producto que no está `VALIDADO`.

### R-011 · REFACTOR · Priority 13.50 · Esfuerzo S · D4

**Que `[START FOUNDATION]` no pueda deshacer ADR-049 en silencio.**

`Priority = (6 × 1.5 × 1.5 × 1.0) / 1 = 13.50`

- **Origen:** `evidence/PT-141/self-review.md` y el bloque de riesgos de `HANDOFF.md`.
- **Verificación:** la protección son **tres avisos en prosa** —en `CLAUDE.md`, en el README de
  `enterprise-documentation/` y en el de `archive/`—. **Nada mecánico lo impide.**
- **Racional:** ADR-049 acaba de archivar nueve documentos. Una ejecución de Foundation Protocol que
  los reemita deshace la decisión, y lo haría **sin error**: aparecerían nueve ficheros y todo
  seguiría en verde. Es el patrón de este repositorio otra vez — un control que sólo existe como texto
  no es un control (RULE-14).
- **Ventana:** PT-141.B (`[START FOUNDATION]`) está desbloqueado y pendiente de decisión humana. **Si
  se va a ejecutar, esto va antes**; de ahí el `+0.5` de urgencia.
- **Forma sugerida:** una guarda que falle si reaparece en la raíz cualquiera de los nueve nombres
  archivados. Barata, y con caso de control obvio.

### R-017 · FEATURE · Priority 9.00 · Esfuerzo S · D1

**La reputación de un vendedor se mira antes de registrarse.**

`Priority = (4 × 1.5 × 1.0 × 1.5) / 1 = 9.00`

- **Origen:** S-002-V, `PENDIENTES` #5, marcado ya entonces como **«Humano decide»**.
- **Racional:** `/api/v1/users/:id/ratings` exige sesión. Es exactamente el dato que un comprador
  consulta **antes** de tener cuenta, así que la protección impide el uso que justifica el dato.
- **Por qué no lo decide FPGE:** es una elección de producto con cara de bug — puede haber una razón
  deliberada (raspado de reputación, privacidad del vendedor). `DomainMultiplier` 1.5 porque afecta al
  producto, no al código.

### R-016 · REFACTOR · Priority 3.00 · Esfuerzo M · D2

**La suite QA por navegador corre sobre HTTP.**

`Priority = (4 × 1.5 × 1.0 × 1.0) / 2 = 3.00`

- **Origen:** S-002-V, `PENDIENTES` #3.
- **Racional:** todo lo que dependa de **origen seguro** —cookies `Secure`, APIs que el navegador
  reserva a HTTPS— **no queda ejercido**. La suite pasa, y lo que no probó no aparece por ninguna
  parte. Esfuerzo M: TLS local exige certificado, confianza en el almacén del SO y tocar el fichero
  hosts que ya usan los subdominios `ironloot.local`.

### R-018 · BUG · Priority 1.20 · Esfuerzo S · D2

**La suite del API no cabe en el contenedor con los workers por defecto.**

`Priority = (4 × 0.3 × 1.0 × 1.0) / 1 = 1.20`

- **Origen y verificación (2026-07-29):** con `--maxWorkers=2`, **tres suites mueren por SIGKILL**
  (OOM) y el resumen dice `4 failed`. Con `--runInBand` pasan **786/786 en 102 suites**. En CI no
  ocurre.
- **Racional:** no es un defecto del código. Es malo igualmente: quien la ejecute en local lee «4
  failed», comprueba que uno de los fallos es OOM y **aprende a descartar los fallos de esa suite**.
  Así es como un fallo verdadero pasa desapercibido.
- **Forma sugerida:** fijar `maxWorkers` en la configuración de Jest, o subir el límite de memoria del
  contenedor. Lo que **no** vale es dejarlo en una nota: fue una prevención que se quedó en una nota
  lo que hizo volver a H-014 en cuatro días.

### R-014 · REFACTOR · Priority 1.20 · Esfuerzo S · D2

**`pages-moderation.js` usa `style.display`.**

`Priority = (4 × 0.3 × 1.0 × 1.0) / 1 = 1.20`

- **Origen y verificación:** PT-139; **2 ocurrencias** hoy en el fichero.
- **Racional:** funciona, y por eso es fácil dejarlo. Pero es el patrón exacto contra el que avisa
  RULE-19: `style.display = ''` devuelve el elemento **a lo que diga el CSS**, y el CSS de ADMIN ahora
  puede decir `display: none`. Las pestañas de ADMIN se pasaron a `classList` justamente por eso, y
  `pages-refunds.js` (PT-139) ya nació con la forma correcta. Queda un fichero con la vieja.

### R-015 · REFACTOR · Priority 0.60 · Esfuerzo M · D2

**La imagen de producción del API se lleva dependencias de desarrollo.**

`Priority = (4 × 0.3 × 1.0 × 1.0) / 2 = 0.60`

- **Origen:** S-002.
- **Verificación parcial, y se declara:** el **tamaño** está medido —`ironloot-api:pt129` **548 MB**
  frente a `ironloot-admin` **362 MB**—; la **causa** (dependencias de desarrollo en la capa final)
  viene de S-002 y no se ha vuelto a comprobar en esta corrida. FPGE no inspecciona imágenes.
- **Racional:** superficie de ataque y tiempo de despliegue. **Compone con R-008**: cuanto menos lleve
  la imagen, menos tiene que encontrar el escáner. Si se hacen los dos, **R-008 va primero** — mide
  antes de recortar, o no sabrás qué recortaste.

---

## No compiten en el algoritmo — son decisiones o corridas de protocolo

Estos no son ítems de roadmap. Promover cualquiera a un `PT-XXX` sería un error de categoría, y
listarlos aquí evita que se confundan con trabajo pendiente de FDGE.

| Qué | Quién | Nota |
|---|---|---|
| **`resume PTSA` (delta sync)** | Agente, a petición | **Recomendado antes que nada**: 91 commits sin auditar. Es trabajo PTSA, no FDGE |
| **PT-141.B — `[START FOUNDATION]`** | Humano decide cuándo | Los cuatro prerrequisitos cerrados y el protocolo ya acotado (ADR-049). Ver **R-011** primero |
| **Once VoBo pendientes** (PT-136…PT-147) | Humano | `[R44]`: el agente no cierra bugs. `PENDING_TASKS.md` § 2 |
| **PT-035 · T-035.12** | Humano | Validación **visual**, no automatizable |
| **CFDI/PAC (TD-001)** · **Stripe y HeyBanco (TD-002)** | Humano | Bloqueados por contratos y credenciales externas. No se intentan |

## Dos pendientes que ya no lo son

FPGE es **gobernado por evidencia**: sin evidencia, no hay candidato. Dos filas de
`PTSA/PENDIENTES.md` § «Lo que se sabe que falta medir» **ya no son ciertas**, y no entran al roadmap:

| Fila | Decía | Qué se midió el 2026-07-29 |
|---|---|---|
| #6 | *«Los 12 productos siguen en BORRADOR; falta auditar la salida real de seis»* | **11 `VALIDADO` y 1 `IDENTIFICADO`** (P-012, bloqueado por H-005). Coincide con `score-history.json` |
| #7 | *«Definir las rúbricas en F-1. Sin ellas ningún producto llega a `VALIDADO`»* | **Definidas en `F-1 § 5`** — cuatro criterios, y el checklist de F-1 las da por identificadas |

Que dos pendientes vivos estuvieran ya resueltos es, en pequeño, lo mismo que abrió esta tanda de
trabajo: *«siempre quedan cosas por hacer y nunca se cierran completo»*. **La corrección va en
`PTSA/PENDIENTES.md`, que es quien manda para esa clase de pendiente — FPGE es de sólo lectura sobre
PTSA y no lo toca.**

---

## Cómo leer los números

`Priority = (EvidenceWeight × ScoreImpact × Urgency × DomainMultiplier) / Effort`

**Un ajuste declarado, porque cambia el resultado.** `ScoreImpact` se define como *penalización
removida × peso de la dimensión*. Sólo **R-010** nace de un hallazgo activo; los otros diez previenen
defectos que **todavía no están penalizados**, así que su `ScoreImpact` literal sería **0** y el
algoritmo los ordenaría a todos empatados a cero. Se usa por tanto la **penalización evitada**: la que
se aplicaría si el defecto latente se registrara como hallazgo, a la severidad que su evidencia
sostiene. Queda marcado ítem a ítem como *«evitado»* frente al *«real»* de R-010.

Es una estimación, y por eso se declara en vez de esconderse dentro de una cifra. Sin ella FPGE no
podría priorizar **prevención** — que es la mayor parte de lo que este repositorio ha aprendido a
hacer.

| Factor | De dónde sale aquí |
|---|---|
| `EvidenceWeight` | Impacto × Probabilidad del hallazgo de origen. Sin hallazgo: **6** para un hueco medido en un control, **4** para un menor medido |
| `ScoreImpact` | Penalización (30/15/5/1) × peso de dimensión (D1/D2/D3 = 0.30, D4 = 0.10) |
| `Urgency` | 1.0 base · `+0.5` si `audit_due` vencido (**ninguno lo está**) · `+0.5` si la dimensión está STALE o en regresión |
| `DomainMultiplier` | 1.5 en D1 (R-009, R-010, R-017), 1.0 en el resto |
| `Effort` | S=1 · M=2 · L=4 |

**Ningún tope silencioso:** los once candidatos evaluados aparecen los once. Nada se recortó por
longitud ni se dejó fuera por parecer menor.

---

## Siguiente paso

1. **`resume PTSA`** — recalcular con 91 commits nuevos encima. Puede reordenar todo lo de arriba.
2. Marcar cada ítem `APROBADO` / `DIFERIDO` / `DESCARTADO`.
3. Por cada `APROBADO`: `promote FPGE R-XXX` → PT nuevo en FDGE STATE 1
   (`BUG`→1-B · `FEATURE`→1-E · `REFACTOR`→1-R · `INVESTIGATION`→1-B modo investigación).

FPGE **se detiene aquí**. No promueve nada por sí mismo.

# PT-130 — Tareas atómicas

Sin dependencias duras. La parte documental (.1 a .4) puede ir en paralelo a PT-127.
La tarea .8 espera a **PT-128** (pipeline que pueda ejecutar algo).

---

## PT-130.1 — Barrido de los cinco documentos del alcance

- **Objetivo**: saber cuántos casos hay de verdad, y **qué formas de afirmación** existen — que es
  lo que la guarda tiene que reconocer. Escribirla antes sería adivinar el formato.
- **Entrada**: `CLAUDE.md`, `02-PRD.md`, `03-TRD.md`, `06-Backend-Architecture.md`,
  `09-Security-Architecture.md`.
- **Salida**: inventario de afirmaciones contrastables — versiones citadas y rutas HTTP — con su
  veredicto: coincide / no coincide.
- **Validación**: el inventario incluye los tres casos ya conocidos (TRD NestJS,
  Backend-Architecture ×4, `CLAUDE.md:138`).
- **Status**: PENDING

## PT-130.2 — RED: la guarda, antes de las correcciones

- **Objetivo**: **tests-first no es opcional.** La guarda debe fallar con la documentación de hoy.
- **Entrada**: el inventario de PT-130.1 · el patrón de `coherencia-deuda-tecnica.spec.ts`.
- **Salida**: `src/api/test/unit/documentacion/coherencia-documentacion-codigo.spec.ts`.
- **Validación**: **falla** (RED), y nombra los casos que el inventario encontró.
- **Status**: PENDING

> Este orden importa: si se corrigen los documentos primero, la guarda nace en verde y **nunca se
> habrá visto fallar**. Es exactamente el defecto de H-017 (un healthcheck que nadie vio pasar) y
> de H-015 (un job que nadie vio en verde), aplicado a una prueba.

## PT-130.3 — Corregir las versiones citadas

- **Entrada**: `03-TRD.md:13`, `06-Backend-Architecture.md:9-13`, más lo que salga del barrido.
- **Salida**: las citas coinciden con los `package.json` (`@nestjs/core ^11.0.0` ×4; Express 5).
- **Validación**: la parte de versiones de la guarda pasa.
- **Status**: PENDING

## PT-130.4 — Corregir las rutas documentadas

- **Entrada**: `CLAUDE.md:138` — `/health` y `/health/detailed`.
- **Salida**: `/api/v1/health` y `/api/v1/health/detailed`.
- **Validación**: la parte de rutas de la guarda pasa. Y comprobado en vivo:
  `curl -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health` → **200**.
- **Status**: PENDING

> Cambio mínimo y acotado a esa fila. `CLAUDE.md` es instrucción vinculante para todo agente futuro
> (D5): nada más de ese fichero entra en este PT.

## PT-130.5 — GREEN + caso de control

- **Objetivo**: demostrar que la guarda detecta lo que dice detectar.
- **Validación**:
  - con las correcciones puestas, la guarda **pasa**;
  - devolver `^10.3.0` al TRD → **falla**;
  - devolver `/health` a `CLAUDE.md` → **falla**;
  - revertir ambos → pasa.
- **Status**: PENDING

## PT-130.6 — Sin cláusula de escape

- **Objetivo**: que la guarda no se salte a sí misma cuando faltan los documentos.
- **Entrada**: D3 — `docs/` **ya no está gitignored** (H-009 corregido, comprobado en S-002).
- **Salida**: la guarda exige los cinco documentos; si falta uno, **falla**.
- **Validación**: renombrar temporalmente un documento → la guarda falla en vez de saltarse.
- **Status**: PENDING

## PT-130.7 — Revisar la guarda de PT-103

- **Objetivo**: aprovechar que la premisa que la limitaba ya no se cumple.
- **Entrada**: `coherencia-deuda-tecnica.spec.ts` y su comentario sobre `.gitignore`.
- **Salida**: o se le quita la cláusula de escape, o se escribe **por qué se conserva**. Las dos
  respuestas valen; dejarlo sin decidir, no.
- **Validación**: el fichero refleja la decisión y su motivo. Si se le quita, la prueba sigue verde.
- **Status**: PENDING

## PT-130.8 — Las dos guardas en CI *(espera a PT-128)*

- **Objetivo**: que corran solas. Una guarda que sólo corre cuando alguien se acuerda es media
  guarda.
- **Entrada**: `ci.yml` ya arreglado por PT-128.
- **Salida**: ambas dentro de la suite que CI ejecuta.
- **Validación**: corren en el pipeline y pueden ponerlo rojo.
- **Status**: PENDING — **bloqueada por PT-128**

## PT-130.9 — Regresión

- **Validación**: `typecheck` limpio · **604** tests del API (603 + la guarda nueva) · 134 de CORE ·
  ninguna regla de `CLAUDE.md` alterada más allá de la fila del `health` (diff revisado línea a
  línea).
- **Status**: PENDING

## PT-130.10 — Evidencia y self-review (STATE 5)

- **Salida**: `docs/implementation/evidence/PT-130/` con el inventario del barrido, las corridas RED
  y GREEN, los casos de control, y `self-review.md`.
- **Status**: PENDING

## PT-130.11 — Registro (STATE 7)

- **Salida**: `HISTORY.log` (`PTSA reference: H-016`) · `HANDOFF.md` ·
  `PTSA/Hallazgos/H-016.md` a `CORREGIDA` por `## Revisión`.
- **Validación**: H-016 es tipo `PROCESS` — `[R43]` permitiría al auditor cerrarlo con evidencia.
  **Aun así se deja en `CORREGIDA`**: la coherencia de estados con H-014, H-015 y H-017, todos
  pendientes de validación humana, vale más que cerrar uno por separado.
- **Status**: PENDING

---

## Commits previstos

```
test:  PT-130 la guarda de coherencia documentacion-codigo    (RED, .2)
docs:  PT-130/H-016 las versiones citadas coinciden con el codigo   (.3)
docs:  PT-130 las rutas de health documentadas son las reales       (.4)
test:  PT-130 la guarda exige los documentos, ya no se salta        (.6 .7)
docs:  PT-130 evidencia, historia y H-016 a CORREGIDA               (.10 .11)
```

---

## Revisión S-002-R2 — tareas afectadas

**PT-130.1 (barrido)** — deja de ser exploratorio: ya se sabe que en la tabla de stack de
`03-TRD.md` hay **5 citas rotas y 3 versiones falsas**. La tarea mantiene su objetivo (barrer los
cinco documentos) y arranca con ese inventario hecho.

**PT-130.2 (RED)** — la guarda comprueba **dos cosas por fila citada**, no una:

1. la línea citada existe y **contiene el paquete que la fila dice** → hoy fallan **5 de 5**;
2. la versión declarada coincide con la instalada → hoy fallan **3 de 5**.

Comprobar sólo lo segundo habría dejado pasar que ninguna cita resuelve.

**PT-130.3 (corregir versiones)** — no es una fila, son tres, y además las cinco citas:

| Fila | Poner | Y arreglar la cita a |
|---|---|---|
| NestJS | `^11.0.0` (instalado **11.1.28**) | la línea real de `@nestjs/core` |
| Prisma | instalado **5.22.0** | la línea real de `@prisma/client` |
| TypeScript | instalado **5.9.3** | la línea real de `typescript` |
| Node.js · npm | valores correctos ✅ | las citas, que también apuntan mal |

**Decisión pendiente para el Gate, menor**: si la fila declara el **rango** (`^11.0.0`) o la
**versión resuelta** (`11.1.28`). Se propone declarar el rango y añadir columna de versión resuelta:
el rango es lo que gobierna la instalación; la resuelta es lo que corre. Los dos datos importan y
hoy no está ninguno.

**PT-130.11 (registro)** — H-016 pasa a `CORREGIDA` con severidad **ALTA**, no MEDIA.

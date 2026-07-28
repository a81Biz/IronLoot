# PT-130 — Design: que la documentación no pueda mentir en silencio

**Tipo**: BUG · **Complejidad**: STANDARD · **Origen**: PTSA **H-016** (MEDIA, D4) · Evidencia **E-020**
**Fuentes**: `DISCOVERY.md` § PT-130 · `CONTEXT_ANALYSIS.md` § PT-130 · `PLAN_ACTUAL.md` ·
`src/api/test/unit/documentacion/coherencia-deuda-tecnica.spec.ts` (el patrón) ·
`HISTORY.log` (PT-090, PT-103).

---

## El problema en una frase

`03-TRD.md:13` declara `NestJS ^10.3.0` **citando `src/api/package.json:36`**, y esa línea dice
`^11.0.0` desde PT-126.

## Es la tercera vez

| Cuándo | Qué mintió | Cómo se arregló |
|---|---|---|
| PT-090 | El registro de deuda técnica | A mano |
| PT-103 (F-33) | El registro de deuda técnica, **otra vez**, tres PT después | A mano **+ una guarda ejecutable** |
| **Ahora** | El TRD y `CLAUDE.md` | ← este PT |

PT-103 dejó escrita la conclusión, y vale entera para este caso:

> *«La conclusión no es "hay que tener más cuidado": es que la disciplina sin mecanismo caduca.
> Esta guarda es el mecanismo.»*

Corregir los tres casos a mano y no dejar mecanismo sería repetir PT-090.

---

## Decisiones

### D1 — Sólo se comprueban afirmaciones contrastables, nunca prosa

La guarda mira dos clases de afirmación, y ninguna más:

| Clase | Ejemplo | Contra qué se contrasta |
|---|---|---|
| **Versión de dependencia citada** | `\| NestJS \| ^10.3.0 \| src/api/package.json:36 \|` | el `package.json` citado |
| **Ruta HTTP documentada** | `/health` y `/health/detailed` | el prefijo global de `main.ts` |

Prosa, descripciones, decisiones de diseño y todo lo demás quedan **fuera**. Es la decisión 1 de
`coherencia-deuda-tecnica.spec.ts`, literal:

> *«Es estrecha a propósito… Un falso negativo deja pasar una incoherencia; un falso positivo hace
> que alguien borre la guarda, y entonces se pierde también lo que sí protegía.»*

### D2 — La cita es lo que la hace comprobable

`03-TRD.md` tiene una columna de fuente con `fichero:línea`. **Esa columna es lo que convierte la
tabla en verificable**, y por eso la guarda se ancla ahí: lee la cita, abre el fichero, compara.

Corolario de diseño que conviene dejar dicho: **una afirmación sin cita no es verificable y la
guarda no la mira.** Si se quiere que algo esté protegido, hay que citarlo. Eso convierte la
convención de citar en algo que da beneficio, no sólo trabajo.

### D3 — La guarda ahora **sí** puede correr en CI

`coherencia-deuda-tecnica.spec.ts` se salta a sí misma cuando faltan los documentos, y lo explica:

> *«`docs/` está en `.gitignore`, así que en un clon limpio o en CI no existen… Limitación real:
> esto protege a quien tiene los documentos.»*

**Esa premisa ya no es cierta.** H-009 se corrigió y los cinco documentos del alcance están seguidos
por git — comprobado en S-002. Así que:

1. La guarda nueva **no necesita** la cláusula de escape: puede exigir los documentos.
2. Se revisa si `coherencia-deuda-tecnica.spec.ts` puede perder la suya y entrar en CI de verdad.

Es una mejora que sale gratis de un hallazgo ya cerrado, y que nadie habría visto sin releer el
comentario de PT-103.

### D4 — El barrido antes de la guarda

Antes de escribir la guarda se barren los cinco documentos de `coverage_targets.docs` buscando más
afirmaciones contrastables. Por dos razones: para no dejar casos conocidos sin corregir, y porque
**el barrido dice qué formas de afirmación existen de verdad** en estos documentos — que es lo que
la guarda tiene que saber reconocer.

Escribir la guarda antes del barrido sería adivinar el formato.

### D5 — `CLAUDE.md` se toca con cuidado

Es instrucción vinculante para todo agente que trabaje en el repositorio. El cambio se limita a la
fila del módulo `health` (línea 138). Nada más de ese fichero entra en este PT.

---

## Alternativas descartadas

**Corregir los tres casos y ya.** Es lo que se hizo en PT-090 y volvió tres PT después. La tercera
vez pide mecanismo.

**Generar el TRD automáticamente desde los `package.json`.** Elimina la clase entera de defecto y
elimina también el juicio humano que hace útil un TRD. Y sería un PT mucho mayor.

**Una guarda que compruebe toda la documentación contra todo el código.** Falsos positivos
garantizados, y el final conocido: alguien la desactiva. D1 existe para evitarlo.

**Quitar la columna de fuente del TRD** para que no pueda contradecirse. Sería resolver el problema
destruyendo lo que hace bueno al documento.

---

## Componentes tocados

| Fichero | Cambio |
|---|---|
| `docs/enterprise-documentation/03-TRD.md` | Versión de NestJS y las que salgan del barrido |
| `docs/enterprise-documentation/06-Backend-Architecture.md` | «NestJS 10» ×4 |
| `CLAUDE.md` | Fila del módulo `health` (línea 138) |
| `src/api/test/unit/documentacion/coherencia-documentacion-codigo.spec.ts` | **nuevo** |
| `src/api/test/unit/documentacion/coherencia-deuda-tecnica.spec.ts` | Revisar la cláusula de escape (D3) |

## Lo que no se toca

**`main.ts` y las rutas.** El prefijo global es correcto; lo que está mal es el documento. Añadir un
alias `/health` para que la documentación acierte sería adaptar el sistema a su descripción
equivocada — el mismo error, al revés.

---

## Revisión S-002-R2 (2026-07-27) — el defecto es mayor, y una corrección de redacción

### Lo que hay que corregir del propio hallazgo

**La migración a NestJS 11 SÍ está documentada.** PT-126 dejó `REFACTOR_SCOPE.md` (STATE 1-R
completo, con la autorización humana citada), `CONTEXT_ANALYSIS.md`, entrada detallada en
`HISTORY.log` y `HANDOFF.md`. H-016 nunca fue sobre eso, pero estaba redactado de forma que podía
leerse así.

**Son dos corpus con dueños distintos:**

```
docs/implementation/            FDGE — el registro del trabajo        ACTUALIZADO por PT-126
docs/enterprise-documentation/  Foundation Protocol — la referencia   NO actualizado
```

Este PT sólo toca el segundo, más la fila 138 de `CLAUDE.md`.

### El alcance real, medido

Se verificaron las **cinco** filas de la tabla de stack de `03-TRD.md`:

| Fila | Declarado | Real | Cita | Qué hay en esa línea |
|---|---|---|---|---|
| Node.js | ≥ 20.0.0 | ✅ | `package.json:137` | `],` |
| npm | ≥ 10.0.0 | ✅ | `package.json:138` | `"moduleNameMapper": {` |
| NestJS | ^10.3.0 ❌ | **11.1.28** | `package.json:36` | `},` |
| Prisma | ^5.8.0 ❌ | **5.22.0** | `package.json:50` | `"@nestjs/platform-express"` |
| TypeScript | ^5.3.3 ❌ | **5.9.3** | `package.json:101` | `"prettier"` |

**5 de 5 citas rotas. 3 de 5 versiones falsas.** No es una fila vieja: es que la columna que existe
para poder verificar el documento no permite verificar nada.

**H-016: MEDIA → ALTA.** El PT sigue siendo STANDARD —el trabajo no crece tanto— pero sube en
prioridad: pasa a ser el segundo por riesgo (9 ALTO) y el más barato de los cuatro.

### Lo que esto confirma del diseño

**D2 acierta de pleno, y por más razón de la prevista.** La guarda debía anclarse en la cita; ahora
se sabe que **la cita es exactamente lo que está roto**. Comprobar sólo el valor de la versión
habría dejado pasar que ninguna fuente resuelve.

La guarda comprueba, por tanto, **dos cosas por fila**:

1. Que la línea citada **existe y contiene el paquete que dice** — hoy fallan las cinco.
2. Que la versión declarada **coincide con la real** — hoy fallan tres.

### Un regalo del propio repositorio

Ocho líneas más abajo, el **mismo** `03-TRD.md` § 2.1 dice:

```
- Health check path: GET /api/v1/health   (`docker-compose.yml:116`)
```

**Correcto**, y contradice a `CLAUDE.md:138`. El dato bueno ya está en el repositorio, en el mismo
fichero que el malo. No hay que averiguar nada — hay que hacer que algo lo compare. Que es el PT.

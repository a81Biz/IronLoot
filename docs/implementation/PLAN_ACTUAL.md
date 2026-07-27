# PLAN_ACTUAL — PT-112: el repositorio versiona decisiones, no artefactos (H-009 + F-37)

**Fecha**: 2026-07-27 · **Tipo**: REFACTOR · **Complejidad**: STANDARD · **Estado**: STATE 2
**Entrada**: `DISCOVERY.md` § PT-112 · PTSA H-009 · matriz F-37

---

## 1. Objetivo

Que el `.gitignore` distinga entre lo que hay que **conservar** y lo que se **regenera**.

Hoy hace lo contrario: deja fuera la arquitectura, la historia de decisiones y la auditoría entera,
y deja dentro 164 MB de capturas de corridas de QA.

## 2. El criterio

**Se versiona lo que registra una decisión. No se versiona lo que se puede volver a generar.**

| Entra | Por qué |
|---|---|
| `docs/enterprise-documentation/` (196 K) | Arquitectura, PRD, TRD, seguridad. Es lo que `audit-scope.yaml` declara auditable — sin historial, la frescura de D4 no es calculable |
| `docs/methodology/` (288 K) | Los frameworks que gobiernan el trabajo |
| `docs/implementation/*.md` y `HISTORY.log` | La historia de decisiones. `HISTORY.log` es **append-only** por diseño: es literalmente un registro histórico fuera del control de versiones |
| `changes/` (601 K) | Los Proposal Packages: el razonamiento de cada PT |
| `PTSA/` (320 K) | Hallazgos, evidencias, scores. **Es el rastro de auditoría** |
| `CLAUDE.md` | Lo que lee cualquier agente antes de tocar el repositorio |

| Sale | Por qué |
|---|---|
| **`qa-out/`** (164 M, 2828 ficheros) | Salida de corridas. Se regenera con `bash run-all.sh`. Y `.last-run` ensucia `git status` tras cada ejecución |
| `docs/implementation/evidence/` salvo `.md` | Las capturas y volcados son artefactos; el `self-review.md` y los resúmenes son decisión |
| `graphify-out/` | Generado. Se reconstruye desde el código |

Total que entra: **~3.3 MB de texto**. Total que sale: **164 MB de binarios**.

## 3. Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Versionar sólo los 5 documentos que cita `audit-scope.yaml`** | Cierra H-009 a medias: la guarda de PT-103 lee `HISTORY.log`, que seguiría fuera, así que seguiría sin correr en CI |
| **Dejarlo y retirar los documentos del alcance de PTSA** | Honesto pero peor: el alcance dejaría de prometer lo que no puede cumplir, a cambio de renunciar a auditar D4 por diff |
| **Versionarlo todo, `qa-out` incluido** | 164 MB de capturas que se regeneran. Un repositorio no es un almacén de artefactos |
| **`git lfs` para `qa-out`** | Añade una herramienta y una configuración para conservar algo que nadie va a consultar |

## 4. Análisis de regresión

| Qué | Riesgo | Cómo se comprueba |
|---|---|---|
| **Perder el historial de `qa-out`** | Las corridas del 24-jul dejan de estar en el árbol | **Siguen en los commits anteriores.** `git show <commit>:qa-out/...` las recupera |
| Que entre un secreto al versionar `docs/` | **Alto** — `docs/` nunca se ha revisado con ese ojo | Barrido explícito de credenciales antes de añadir nada |
| `paypal-sandbox.json` u otros ficheros con credenciales | Deben seguir fuera | Se comprueba uno a uno |
| El tamaño del repositorio | Que crezca de golpe | 3.3 MB de texto: irrelevante |
| La guarda de PT-103 | Debe **empezar** a correr en CI | Se comprueba que deja de saltarse |

## 5. Criterios de éxito

1. `git check-ignore` deja de marcar los 5 documentos de `audit-scope.yaml`.
2. `git ls-files qa-out/` → **0**.
3. **Cero credenciales** en lo que se añade — comprobado, no supuesto.
4. La guarda de coherencia documental **deja de saltarse**.
5. `git status` limpio tras una corrida de QA.
6. `npm test` y la suite siguen verdes.

## 6. Restricciones

- **Ningún secreto entra al repositorio.** Se barre antes de añadir.
- `git rm --cached` no borra del disco ni de la historia: sólo deja de seguir.
- H-009 y F-37 **no se cierran**: los cierra el humano.

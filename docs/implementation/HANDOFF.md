# HANDOFF — estado actual

**FDGE V3** · **2026-07-29** · Se **sobrescribe**: es el estado de ahora, no la historia. La historia
está en `HISTORY.log`, que es append-only.

**Rama**: `master`, árbol limpio, cero ramas sin fusionar.
**Sin subir a `origin`**: unos cuantos commits locales. `git push origin master` cuando quieras.

**Pruebas**: **1072** unitarias en verde — API **819** (106 suites) · CORE **134** · CLIENT **103** ·
ADMIN **13** · BASE **3**. Medidas una a una el 2026-07-29.

> Y desde PT-159, `npx jest` **sin flags** pasa la suite del API dentro del contenedor. Antes tres
> suites morían por SIGKILL y el resumen decía «4 failed» sin que nada estuviera roto — que es como
> se aprende a ignorar los fallos de una suite.

**Reglas duras**: **28** `RULE-NN`. Las nuevas de hoy: RULE-28 (el alcance de auditoría no cita lo que
no existe) · RULE-29 (ADR-049 no se deshace sola) · RULE-30 (toda `data-accion` tiene manejador) ·
RULE-31 (la evidencia citada está en git).

---

## La tanda FPGE-003: quince PT, cerrados

Doce ejecutados, dos bloqueados por decisión externa, uno **medido y revertido con motivo**.

| Bloque | PT | Qué |
|---|---|---|
| Instrumentos | **149 · 153** | `audit:domain` afirmaba `cross_coherence_verified = true` con las cinco comprobaciones en error, y salía con 0. Los dos checkpoints pasan a `PrismaClient` y corren donde vive npm |
| Guardas | **148** | El contrato SSR↔API cubre los tres sitios. Destapó **tres defectos de la propia guarda**, ninguna ruta rota |
| Guardas | **154 · 157** | El alcance de auditoría verificado, y ADR-049 con mecanismo |
| Guardas | **152** | La evidencia citada entra en git: 81 de 189 ficheros estaban fuera |
| CI | **150** | Escáner de la imagen base. **TD-016 cerrada** |
| Pequeños | **159 · 160 · 162** | PT-160 no era pequeño: **las tres `data-accion` de ADMIN estaban muertas** |
| Investigación | **151** | El patrón de H-019 no se repite, **y ahora se sabe por qué** |
| Medido y revertido | **161** | 3.1 % de ahorro no justifica tocar esa zona |
| Bloqueados | **155 · 156** | Decisión fiscal y decisión de producto |

### Lo que más importa de esta tanda

**Tres cosas se descubrieron sólo porque algo las miró, no porque nadie sospechara:**

1. `audit:domain` **afirmaba haber verificado lo que no miró** — dentro del instrumento que la
   auditoría usa para medir.
2. **Las tres acciones de ADMIN estaban muertas.** PT-096 movió el JS «tal cual» y «tal cual» perdió
   los `onclick` que lo cableaban. PT-139 corrigió dos casos **sin escribir el mecanismo**, y por eso
   quedaban tres.
3. `audit-scope.yaml` citaba cuatro documentos que **PT-141 archivó el día anterior** — y al
   corregirlo apareció una **segunda lista** con las mismas rutas. Sin guarda, habría quedado
   mintiendo en otro sitio y yo lo habría dado por cerrado.

**Y dos cosas que rompí yo y detectó el mecanismo**: `test:guardas` apuntando al fichero que renombré
horas antes, y dos líneas nuevas en `package.json` desplazando citas del TRD — esto último lo cazó la
guarda de PT-130 en la misma corrida. **H-016 detectado en vivo.**

## Auditoría — S-003

```
Health 88.9  ·  Risk 100 (saturado por certeza, no gravedad)  ·  Confidence 87.0  ·  Clase B
```

**H-021, H-022, H-023 y H-024 → `CORREGIDA`.** No `CERRADA`: `[R44]` reserva el cierre a una persona
que haya visto la evidencia, y que me autorizaras a trabajar en autonomía no cambia quién valida.

**H-005 sigue `ABIERTA`** y mantiene D1 en 85. PT-155 documentó las tres opciones; ningún PT la cierra.

## Lo que queda, en `PENDING_TASKS.md`

Tres decisiones tuyas (PT-156, H-005, PT-141.B) y seis pendientes con dueño claro — entre ellos triar
el inventario del escáner nuevo, y medir D1/D5 completos, que exigen una base con historia.

## Riesgos vivos

- **Diecinueve PT sin VoBo** (los cuatro de S-003 más los quince de FPGE-003). Es mucha superficie sin
  confirmar por una persona.
- **El TLS de PT-158 no lo ha ejercido nadie.** La configuración está escrita y `nginx -t` la valida,
  pero nadie la ha arrancado. Declarado en su README.
- **La línea base del escáner nace vacía.** Es correcto —se declara el mecanismo antes de conocer lo
  que mide— pero significa que hoy **no protege de nada** hasta que se triе la primera corrida.
- **La ventana de D1/D5 sigue estrecha.** `run-all.sh` genera la salida real y **trunca la base al
  empezar**. Medir justo después o volver a quedarse sin datos.

## Siguiente acción recomendada

1. **`git push origin master`**.
2. **Las tres decisiones** de `PENDING_TASKS.md` § 1 — son lo único que bloquea trabajo real.
3. **`run-all.sh` + medir D1/D5** inmediatamente después. Es lo que subiría la cobertura de la
   auditoría del 50 %/0 % actual.

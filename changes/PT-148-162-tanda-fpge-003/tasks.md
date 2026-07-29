# Tareas — tanda PT-148 … PT-162

Orden de ejecución. **No** es el orden de prioridad de FPGE: es el orden en que las dependencias
técnicas lo permiten. Una rama por PT, fusión secuencial, suite completa entre fusiones.

## Bloque 1 — Los instrumentos de auditoría (van juntos)

| # | PT | Tarea | Validación |
|---|---|---|---|
| 1.1 | **PT-153** | Las dos consultas a `PrismaClient.$queryRawUnsafe` | Los dos checkpoints corren **dentro del contenedor** y devuelven datos |
| 1.2 | **PT-153** | Salir ≠ 0 cuando no se pudo medir | Prueba con BD inalcanzable → exit ≠ 0 |
| 1.3 | **PT-149** | `cross_coherence_verified` derivado del resultado | Prueba que inyecta fallo → veredicto **no** es `true` |
| 1.4 | **PT-149** | Tercer estado `SIN_DATOS` en el veredicto | Con base vacía: `SIN_DATOS`, no `true` ni `false` |

> **PT-153 antes que PT-149** aunque FPGE lo puntúe más bajo: sin él no hay forma de comprobar que
> PT-149 quedó bien. Mismos dos ficheros, misma rama.

## Bloque 2 — Las guardas que faltan

| # | PT | Tarea | Validación |
|---|---|---|---|
| 2.1 | **PT-148** | Generalizar la guarda SSR↔API a los tres sitios | RED contra el estado actual si hay rutas rotas |
| 2.2 | **PT-148** | Corregir las rutas que aparezcan en BASE/ADMIN | Cada una con su caso |
| 2.3 | **PT-154** | Guarda: los nueve archivados no reaparecen en la raíz | Caso de control que la vea acusar |
| 2.4 | **PT-157** | Reapuntar `audit-scope.yaml` + guarda del alcance | Las cinco rutas existen; la guarda acusa una rota |
| 2.5 | **PT-152** | Decidir qué evidencia entra, meterla, y guardarla | Ningún documento cita un fichero no seguido |

## Bloque 3 — CI e imagen

| # | PT | Tarea | Validación |
|---|---|---|---|
| 3.1 | **PT-150** | Escáner de imagen base en el job `docker` | Corre en CI; falla ante aviso nuevo |
| 3.2 | **PT-150** | Línea base con triaje fechado y motivado | Documentada como `security-baseline.json` |
| 3.3 | **PT-150** | Cerrar TD-016 — **las dos escrituras** (RULE-08) | `coherencia-deuda-tecnica.spec.ts` en verde |
| 3.4 | **PT-161** | **Confirmar la causa** del tamaño antes de tocar nada | Si no son deps de desarrollo, el PT lo dice y cambia de objetivo |
| 3.5 | **PT-161** | Recortar la capa final | La imagen **construye y arranca** |

> **3.4 antes que 3.5, y PT-150 antes que PT-161**: mide antes de recortar.

## Bloque 4 — Los pequeños

| # | PT | Tarea | Validación |
|---|---|---|---|
| 4.1 | **PT-159** | Fijar `maxWorkers` o subir memoria, lo que se **demuestre** suficiente | Suite completa sin SIGKILL, en contenedor y en CI |
| 4.2 | **PT-160** | `pages-moderation.js` a `classList` | El modal abre y cierra; sin `style.display` |
| 4.3 | **PT-160** | Evaluar extender la guarda de estilos al JS de navegador | Con caso de control, o se declara por qué no |
| 4.4 | **PT-162** | Renombrar / `@ApiExtraModels()` | **El `warn` desaparece del arranque** |

## Bloque 5 — Investigación

| # | PT | Tarea | Salida |
|---|---|---|---|
| 5.1 | **PT-151** | Barrido desde el esquema: modelos con campos `Json`, quién los escribe | `DISCOVERY.md`. Caso real → PT propio |
| 5.2 | **PT-158** | TLS local para la suite QA | Si exige tocar el almacén de certificados del host: entregar configuración + paso manual documentado |

## Bloque 6 — Los bloqueados

| # | PT | Tarea | Salida |
|---|---|---|---|
| 6.1 | **PT-155** | Documentar las tres opciones de emisión de CFDI y sus consecuencias técnicas | `DISCOVERY.md`. **H-005 sigue abierto** |
| 6.2 | **PT-156** | `ENRICHMENT.md` con las tres alternativas de `/ratings` y sus criterios | **Espera tu elección** |

---

## Cierre de la tanda

| # | Tarea |
|---|---|
| C.1 | H-021, H-022, H-023, H-024 a **`CORREGIDA`** — nunca `CERRADA` (`[R44]`) |
| C.2 | Entrada por PT en `HISTORY.log` (append-only) |
| C.3 | `PENDING_TASKS.md` y `HANDOFF.md` al día |
| C.4 | Suite completa en los cinco servicios + los 8 jobs de CI |
| C.5 | Anotar en `PENDING_TASKS.md`: **correr `run-all.sh` y medir D1/D5 justo después** |

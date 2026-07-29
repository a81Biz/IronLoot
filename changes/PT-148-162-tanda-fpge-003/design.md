# PT-148 … PT-162 — Paquete de propuesta de la tanda FPGE-003

**Origen:** los quince ítems de `ROADMAP.md` (R-003), aprobados en bloque por decisión humana el
2026-07-29 y promovidos a `PT-148`…`PT-162`.

**Por qué un paquete y no quince.** El Proposal Gate existe para que ningún código se toque sin que
una persona haya visto antes qué se va a hacer. Eso se cumple igual con un documento que con quince;
lo que no se cumpliría es tocarlo **sin ninguno**. Quince rondas de ACK para tres cambios de dos
líneas serían ceremonia, no control. Aquí está todo lo que se va a hacer, y **un solo ACK lo
desbloquea**.

**Lo que este paquete NO hace:** no relaja tests-first, ni la evidencia, ni el self-review, ni la
prohibición de que el agente cierre bugs. Cada PT genera su rama, sus pruebas en RED antes del código,
su evidencia y su entrada en `HISTORY.log`.

---

## Resumen ejecutable

| PT | R | Tipo | Qué | Estado tras el ACK |
|---|---|---|---|---|
| **PT-148** | R-009 | REFACTOR | La guarda del contrato SSR↔API cubre ADMIN y BASE | Ejecutable |
| **PT-149** | R-019 | BUG | `cross_coherence_verified` se deriva del resultado; sale ≠ 0 si no midió | Ejecutable |
| **PT-150** | R-008 | FEATURE | Escáner de la imagen base en CI | Ejecutable |
| **PT-151** | R-013 | INVESTIGATION | Barrido del patrón de H-019 | Ejecutable |
| **PT-152** | R-012 | BUG | La evidencia citada entra en git | Ejecutable — **con una decisión dentro** |
| **PT-153** | R-020 | REFACTOR | Los dos checkpoints consultan por `PrismaClient` | Ejecutable |
| **PT-154** | R-011 | REFACTOR | Guarda contra que Foundation deshaga ADR-049 | Ejecutable |
| **PT-155** | R-010 | INVESTIGATION | H-005 — quién emite la factura | **BLOQUEADO** — ver abajo |
| **PT-156** | R-017 | FEATURE | `/users/:id/ratings` sin sesión | **BLOQUEADO** — ver abajo |
| **PT-157** | R-021 | BUG | `audit-scope.yaml` reapuntado, y verificado solo | Ejecutable |
| **PT-158** | R-016 | REFACTOR | La suite QA sobre TLS | Ejecutable — **con riesgo de entorno** |
| **PT-159** | R-018 | BUG | La suite del API cabe en el contenedor | Ejecutable |
| **PT-160** | R-014 | REFACTOR | `pages-moderation.js` a `classList` | Ejecutable |
| **PT-161** | R-015 | REFACTOR | La imagen de producción sin dependencias de desarrollo | Ejecutable |
| **PT-162** | R-022 | BUG | `UserResponseDto` deja de estar duplicado | Ejecutable |

**Doce ejecutables · dos bloqueados · uno con riesgo de entorno.**

---

## Los dos que ningún PT puede terminar

Se promueven porque se pidió promoverlos todos, y **se dice aquí en vez de descubrirse a mitad**.

### PT-155 (R-010, H-005) — quién emite la factura

`PTSA/PENDIENTES.md` lo lleva diciendo desde S-001: *«Ningún PT puede resolverlo»*. Requiere dos cosas
que no están en el repositorio:

1. **Contratar un PAC** certificado ante el SAT. Es un contrato con un tercero.
2. **Decidir quién emite la factura** — hay tres opciones en `F-1 § U-005`, y son fiscalmente
   distintas: la plataforma emite en nombre propio, el vendedor emite y la plataforma sólo timbra, o
   la plataforma actúa como intermediario con retención.

**Lo que sí hará PT-155**, y es el máximo honesto: una **investigación** (STATE 1-B, modo
investigación) que documente las tres opciones con sus consecuencias técnicas —qué cambia en el modelo
de datos, en el flujo de liquidación y en las obligaciones de retención—, de forma que la decisión de
negocio se tome informada y el trabajo técnico posterior sea promovible. Cierra como `CLOSED` con
hallazgos documentados, no como resuelto. **H-005 sigue abierto y D1 sigue en 85.**

### PT-156 (R-017) — la reputación antes de registrarse

`PENDIENTES` lo marcó desde S-002-V como **«Humano decide»**, y sigue siendo verdad: abrir
`/api/v1/users/:id/ratings` sin sesión es una elección de producto con cara de bug. Puede haber una
razón deliberada —raspado de reputación, privacidad del vendedor, exposición de volumen de ventas a
la competencia—.

**Lo que hará PT-156:** el `ENRICHMENT.md` (STATE 1-E) con las tres alternativas —abierto, abierto con
límite de tasa agresivo, o agregado público sin detalle— y sus criterios de aceptación. **La
implementación queda a la espera de que elijas una.** Implementarlo por mi cuenta sería decidir por ti
un rasgo del producto.

---

## PT-148 · REFACTOR · La guarda del contrato SSR↔API cubre ADMIN y BASE

**Origen:** H-020 (CERRADA) — el CLIENT pedía `/api/v1/users/settings`, caía en el comodín
`@Get(':id')`, el `ParseUUIDPipe` rechazaba la cadena y devolvía **400 «uuid inválido»**. La página
«Configuración» no cargaba para nadie.

**Qué cambia:** `rutas-que-el-client-invoca.spec.ts` lee hoy sólo `src/apps/client/src` y
`src/apps/client/public/js`. Se generaliza a los tres SSR: CLIENT, BASE y ADMIN, con el JS de
navegador de cada uno.

**Qué NO cambia:** ninguna ruta, ningún controlador. Es una guarda que amplía su alcance.

**Riesgo real, y es el que importa:** al ampliar el alcance **la guarda va a acusar rutas que hoy
nadie mira**. Eso es el hallazgo, no un fallo del PT — pero puede convertir un cambio `S` en trabajo
de corrección. Si aparecen rutas rotas en BASE o ADMIN, **se registran y se corrigen dentro de este
PT**: son exactamente el defecto que H-020 describía.

**Validación:** la guarda falla en RED contra el estado actual si hay rutas rotas; casos de control
que demuestren que sabe acusar y sabe absolver. Y el fichero se renombra —ya no es «del client»—.

## PT-149 · BUG · El veredicto se deriva del resultado

**Origen:** H-021 (ABIERTA, ALTA). `cross_coherence_verified = true` con las cinco comprobaciones en
`(ERR)`, y `exit 0`.

**Qué cambia** en `src/api/scripts/domain-rules.ts`:
- El veredicto **se calcula**: `true` sólo si las cinco midieron y pasaron · `SIN_DATOS` si no
  pudieron mirar · `false` si alguna falló.
- **Código de salida ≠ 0** cuando no se pudo medir. Un fallo que sale con 0 no es un fallo.

**El modelo ya está en el mismo fichero**, tres líneas más arriba: `rubric_compliance_score` devuelve
`null` con el texto *«Esto NO es un 100: es una auditoría que no ha podido mirar»*. Se aplica el mismo
criterio al veredicto de al lado.

**Validación:** prueba que inyecta un fallo de consulta y comprueba que el veredicto **no** es `true`
y que el proceso sale distinto de 0. Sin esa prueba, el arreglo es indistinguible del defecto.

## PT-150 · FEATURE · Escáner de la imagen base en CI

**Origen:** TD-016. `audit:check` mira **paquetes npm**; la imagen base no la mira nadie.

**Qué cambia:** un paso en el job `docker` de `ci.yml`, que desde PT-147 ya construye las cuatro
imágenes y las tiene delante. Escáner con línea base propia —el mismo patrón que
`security-baseline.json`— para que un aviso conocido y triado no rompa el pipeline y uno nuevo sí.

**Criterios de aceptación:** el paso corre en CI · falla ante un aviso nuevo respecto a su línea base
· la línea base se documenta con la fecha y el motivo de cada triaje · **TD-016 se cierra con las dos
escrituras** que exige RULE-08.

**Fuera de alcance:** corregir las vulnerabilidades que encuentre. Este PT construye el instrumento;
lo que mida es trabajo posterior con su propia evidencia.

## PT-151 · INVESTIGATION · El patrón de H-019

**Origen:** H-019 (CERRADA, ALTA) — con `transform: true` al servicio no le llega un objeto plano sino
una **instancia con todas las propiedades declaradas**, las ausentes como `undefined`; un `deepMerge`
sobre `Object.keys()` borraba las ramas que el cliente no mandó, en silencio y con 200.

**Qué se busca, y por qué no es un `grep`:** el defecto no está en `deepMerge` —un primer barrido sólo
devuelve `users.service.ts`, el ya corregido—. Está en **cualquier escritura a una columna `Json` a
partir de un DTO**. El barrido correcto parte del esquema: qué modelos tienen campos `Json`, quién los
escribe, y si esa escritura distingue «no enviado» de «enviado vacío».

**Salida:** hallazgos documentados en `DISCOVERY.md`. Si aparece un caso real, **se abre PT propio**:
un `INVESTIGATION` no arregla, informa. Si no aparece ninguno, cierra `CLOSED` diciendo qué se miró —
que es un resultado, no un no-resultado.

## PT-152 · BUG · La evidencia citada entra en git

**Origen:** F-136-A. Medido hoy: **181 ficheros en `evidence/`, 100 seguidos → 81 fuera**. Cuando se
registró eran 79 de 162: **ha empeorado**.

**La decisión que lleva dentro**, y que hay que tomar antes de escribir nada: **qué evidencia
pertenece al repositorio**. No es obvio — hay capturas, volcados de log y salidas de suite que pesan.
Propuesta: **entra todo lo que un documento cite**, porque ése es el defecto (un documento que cita lo
que no está es H-016); lo que nadie cite se archiva o se descarta explícitamente.

**Qué cambia:** los ficheros citados entran en git; se registra en un documento qué quedó fuera y por
qué. **Y una guarda**: ningún documento de `docs/implementation/` cita un fichero de `evidence/` que
no esté seguido. Sin la guarda esto se vuelve a desviar — es la lección de PT-140.

## PT-153 · REFACTOR · Los dos checkpoints consultan por `PrismaClient`

**Origen:** H-022. `domain-rules.ts:268` y `reliability-check.ts:55` usan
`execSync('docker exec … psql')`, y dentro del contenedor no hay `docker`.

**Qué cambia:** las dos consultas pasan a `PrismaClient.$queryRawUnsafe`, **como ya hace
`observability-check.ts` desde PT-138**. La conexión sale de `DATABASE_URL`, que los dos entornos
tienen. Y salen distinto de 0 cuando no pudieron medir.

**Va con PT-149**, mismos dos ficheros: se hacen en la misma rama o el segundo deshace el contexto del
primero. Y **PT-153 es lo que permite comprobar PT-149**: con `docker exec` roto no hay forma de ver
`cross_coherence_verified` calculado sobre datos de verdad.

**Lo que desbloquea:** D1 y D5 se miden desde donde toca. En S-003 quedaron al 50 % y al 0 %, y eso
costó 8 puntos de Confidence.

## PT-154 · REFACTOR · Que Foundation no pueda deshacer ADR-049 en silencio

**Origen:** mi propio self-review de PT-141 y el bloque de riesgos de `HANDOFF.md`. La protección de
ADR-049 son hoy **tres avisos en prosa** y nada mecánico.

**Qué cambia:** una guarda que falle si reaparece en la raíz de `docs/enterprise-documentation/`
cualquiera de los nueve nombres archivados. Con caso de control: la guarda tiene que saber acusar.

**Por qué antes de PT-141.B:** `[START FOUNDATION]` está desbloqueado. Si se ejecuta primero y reemite
los nueve, deshace la ADR **sin error** — aparecen nueve ficheros y todo sigue en verde.

## PT-157 · BUG · `audit-scope.yaml`, reapuntado y verificado solo

**Origen:** H-024, introducido por PT-141 al archivar los nueve sin seguir esta cita.

**Qué cambia:** las cuatro rutas van a `docs-v2/` según el mapa de ADR-049; el comentario
`# 23 migraciones — ninguna se ha ejecutado nunca` pasa a decir la verdad (**2**, las dos aplicadas).

**Y lo que de verdad justifica el PT:** es la **tercera** vez que el patrón aparece (H-016, PT-130,
esto). Se añade una guarda que verifique **el alcance de auditoría**, igual que ya se verifican las
citas del TRD. Reapuntar cuatro rutas sin eso es esperar a la cuarta.

## PT-158 · REFACTOR · La suite QA sobre TLS

**Origen:** `PENDIENTES` #3. Todo lo que dependa de **origen seguro** —cookies `Secure`, APIs
reservadas a HTTPS— no queda ejercido hoy.

**Riesgo de entorno, declarado:** requiere certificado local y **confianza en el almacén del sistema
operativo**, que es una acción sobre la máquina, no sobre el repositorio. Si no se puede automatizar
sin tocar el almacén de certificados del host, **el PT entrega la configuración y documenta el paso
manual** en vez de dejar a medias algo que aparente funcionar. Es el de esfuerzo `M` y el más probable
que termine parcialmente.

## PT-159 · BUG · La suite del API cabe en el contenedor

**Origen:** medido el 2026-07-29 — con `--maxWorkers=2` tres suites mueren por SIGKILL y el resumen
dice `4 failed`; con `--runInBand` pasan 786/786.

**Qué cambia:** `maxWorkers` fijado en la configuración de Jest, o el límite de memoria del
contenedor, lo que se demuestre suficiente. **Medido, no supuesto.**

**Lo que no vale:** dejarlo documentado en una nota. Fue una prevención que se quedó en una nota lo
que hizo volver a H-014 en cuatro días.

## PT-160 · REFACTOR · `pages-moderation.js` a `classList`

**Origen:** PT-139. Dos ocurrencias de `style.display` hoy.

**Qué cambia:** el modal de moderación usa `classList` como `pages-refunds.js`, que nació ya con la
forma correcta. Funciona hoy; el problema es que `style.display = ''` devuelve el elemento **a lo que
diga el CSS**, y el CSS de ADMIN ahora puede decir `display: none`.

**Y la guarda**: si RULE-19 avisa de esto, algo debería acusarlo. Se evalúa extender
`estilos-fuera-de-plantillas.spec.ts` al JS de navegador.

## PT-161 · REFACTOR · La imagen de producción, sin dependencias de desarrollo

**Origen:** S-002. **Verificación parcial declarada:** el tamaño está medido —`ironloot-api:pt129`
548 MB frente a `ironloot-admin` 362 MB—; la causa viene de S-002 y no se ha vuelto a comprobar.

**Primer paso del PT es confirmar la causa**, no asumirla. Si resulta que no son dependencias de
desarrollo, el PT lo dice y cambia de objetivo.

**Va después de PT-150**: mide antes de recortar, o no sabrás qué recortaste.

## PT-162 · BUG · `UserResponseDto` deja de estar duplicado

**Origen:** H-023. Dos esquemas distintos bajo un nombre en el catálogo que sirve `/docs`.

**Qué cambia:** renombrar uno de los dos, o `@ApiExtraModels()` con nombre explícito. **Validación:**
el `warn` desaparece del arranque — comprobable en los logs, que es donde se detectó.

---

## Análisis de regresión (obligatorio, MAJOR por volumen)

| Qué puede romperse | Por qué | Mitigación |
|---|---|---|
| **Las guardas nuevas acusan código existente** | PT-148 amplía alcance; PT-152 y PT-157 añaden verificación | Es el hallazgo, no el fallo. Se corrige dentro del PT o se abre uno propio, **nunca se exceptúa el fichero** |
| **PT-153 cambia cómo se consulta la BD en dos checkpoints** | `$queryRawUnsafe` en vez de `psql` — el formato de salida difiere | Comparar salida antes/después contra la misma base; PT-153 y PT-149 en la misma rama |
| **PT-150 puede poner CI en rojo** | Un escáner nuevo encuentra lo que nadie miró | Línea base con triaje documentado, igual que `security-baseline.json` |
| **PT-159 toca la configuración de Jest** | Afecta a las 102 suites | Suite completa en verde antes y después, en contenedor y en CI |
| **PT-161 toca el Dockerfile de producción** | Es la familia de H-017 y PT-129/135 | Construir **y arrancar** la imagen, que es lo que PT-147 dejó montado en CI |
| **Nada toca dinero** | Ningún PT de la tanda entra en monedero, pagos, ledger ni liquidación | — |

**El riesgo agregado real de la tanda es el volumen**, no ningún cambio concreto: quince PT sobre el
mismo árbol. Mitigación: **una rama por PT, fusión secuencial, suite completa entre fusiones**. Nada
de una rama gigante.

## Criterios de éxito de la tanda

- Los doce ejecutables, fusionados con evidencia y entrada en `HISTORY.log`.
- **H-021, H-022, H-023, H-024** en `CORREGIDA` — **no cerrados**: `[R44]` reserva el cierre al humano.
- TD-016 cerrado con las dos escrituras (RULE-08).
- 1039+ pruebas en verde en los cinco servicios, y los 8 jobs de CI.
- PT-155 y PT-156 cierran con su artefacto de decisión, **no** como implementados.

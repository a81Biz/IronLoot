# PT-197 — Evidencia

## Cómo se buscó, que es lo que cambió el resultado

**Enumerando el espacio de clases primero**, no leyendo registros en profundidad. Ocho clases medidas
contra su fuente que manda: trabajo FDGE, hallazgos AUD, hallazgos PTSA, deuda técnica, inventarios,
cifras declaradas, citas a fichero, y estado de PTSA.

Las cinco primeras salieron limpias. Los tres huecos estaban en las tres últimas — y **ninguno se
habría encontrado releyendo los registros**, porque ninguno se contradice a sí mismo: hay que
compararlos con la realidad.

## Lo medido

```
1. TRABAJO FDGE      148 encabezados · 0 realmente abiertos          OK
2. HALLAZGOS         36 AUD: 35 corregidos + 1 limitación            OK
                     35 H-XXX, ninguno sin cerrar                    OK
3. DEUDA             26 entradas, abiertas: TD-002, TD-009           OK (las dos de terceros)
4. INVENTARIOS       entities.md: 52 de 56                           <-- HUECO
                     services.md: 39 de 48                           <-- HUECO
5. CIFRAS            módulos 27 · migraciones 3 · RULE-NN 36 · ADR 59  OK
6. CITAS docs-v2     0 rotas                                          OK
7. PTSA              freshness = FRESH, commits_since_audit = 0       <-- FALSO
8. GIT               limpio, al día, sólo master                      OK
```

## Los tres huecos, y por qué son el mismo

**Ninguno afirmaba algo falso sobre lo que nombraba.** Engañaban por otra vía: **se leen como
completos**. Quien busque `PaymentCycleStatus` en el inventario de entidades y no lo encuentre concluye
que no existe, y actúa en consecuencia.

`services.md` además se contradecía a sí mismo: el título prometía *«across services»* y su línea de
origen declaraba sólo `src/api/src/modules/**` y **un** fichero de ADMIN.

Y el certificado PTSA se declaraba fresco con **28 commits y 6 PT** encima, incluida una migración de
esquema y cambios en autenticación — las dos cosas que `[A7]` considera motivo de caducidad.

## Lo que NO se hizo, y es lo que más importa

**No se recalcularon Health, Risk ni Confidence.** Corregir la frescura es medir commits; recalcular la
puntuación exige un delta sync, y PTSA sólo se activa con su disparador explícito. **Inventar un número
ahí sería exactamente lo que `[A1]` prohíbe** — y sería el mismo defecto que el «36/36» que esta serie
de PT ha estado desmontando.

Se anota la consecuencia en vez de esconderla: con `freshness = STALE`, `[A8]` dice que **el score no
es válido** hasta el próximo sync, y §15.6 capta la clase en **C**. El «Clase A» de la tabla es el de
S-010, no el de hoy.

## La guarda, vista fallar

Se añadió un enum al esquema sin inventariarlo:

```
✕ C1: ningun modelo ni enum del esquema falta en el inventario
    + "EnumDeSabotaje",
```

Lo acusa **por nombre**. Restaurado, 7/7.

El sabotaje **afirmó que se aplicó** antes de correr nada — la lección de PT-194, donde un `replace`
que no casaba hizo pasar por buena una guarda que no se había probado.

## Lo que sigue sin guarda, declarado

`routes.md`, `components.md` e `integrations.md`. Sus fuentes no son mecánicamente enumerables como un
esquema Prisma o un patrón de fichero. Ahora consta **en la propia prueba** (`AC-04`), no sólo en el
HANDOFF: un lector de la guarda tiene que ver qué queda fuera sin ir a buscarlo.

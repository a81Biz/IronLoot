# PT-138 — Evidencia

> En `.md` por **F-136-A**.

## 1. Los tres defectos, y el primero no fallaba

### `src/api/scripts` no estaba montado

El contenedor ejecutaba una **copia congelada en la imagen**. Editar `observability-check.ts` y
volver a lanzarlo devolvía el resultado **anterior**, sin avisar.

Es la peor forma de un fallo de entorno: **no falla, miente**. Costó un rato creer que la corrección
no funcionaba.

### `trace_completeness` consultaba con `docker exec`

```
/bin/sh: 1: docker: not found
trace_completeness = SIN_DATOS
```

Sólo funcionaba **desde fuera** del contenedor — que es justo donde RULE-15 dice que no vive npm.

### `SIN_DATOS` salía con código 0

```
trace_completeness = SIN_DATOS
OK — sin silencios nuevos.
codigo de salida: 0
```

Un checkpoint que no había podido medir se leía como aprobado. Es **literalmente** lo que PT-122 dejó
escrito al reclasificar `audit:domain` y `audit:reliability`: *«en CI la base nace vacía y devolverían
`SIN_DATOS` siempre, que alguien acabaría leyendo como verde»*. La lección estaba escrita, y la
métrica de al lado la incumplía.

## 2. La raíz, y por qué su fallo era peor que un `ENOENT`

Catorce ficheros resolvían `RAIZ` subiendo niveles. Dentro del contenedor eso es `/`, y el resultado
no era un error:

```
silent_failure_count = 0   (linea base: 25)
```

**Cero silencios contra una línea base de 25.** Un número plausible, más bajo que el anterior, que
nadie lee como avería. `raizDelMonorepo()` prefiere `/repo` —montado ahora— y **lanza** si no
encuentra la raíz: una raíz equivocada no da error, da resultados vacíos.

## 3. Después

### Dentro del contenedor

```
silent_failure_count = 25   (linea base: 25)
trace_completeness = SIN CICLOS
  no hay ciclos liquidados que evaluar

npm run test:guardas  ->  129 passed, 129 total
```

Las ocho guardas que leen la raíz, más las cinco nuevas de esta tanda.

### En CI

```
GLOBAL: success — los ocho jobs
Observabilidad (D3):
  silent_failure_count = 25   (linea base: 25)
  trace_completeness = SIN CICLOS
```

## 4. Y el hallazgo que dio CI al ponerse rojo

En cuanto `SIN_DATOS` dejó de aprobar:

```
trace_completeness = NO MEDIBLE
  error: Environment variable not found: DATABASE_URL
```

**El job `observabilidad` nunca ha tenido base de datos.** Aprobaba sin medir una de sus dos
métricas, desde PT-121. Que se pusiera rojo **es la prueba de que el arreglo sirve**.

## 5. Dos suposiciones mías, corregidas por la medición

**El OOM no era F-135-B.** Las guardas morían con `SIGKILL` dentro del contenedor y lo di por un
problema de montaje. Era memoria: con `--max-old-space-size=768` pasan las ocho. Queda como
`npm run test:guardas`.

**Y añadir ese script desplazó las citas del TRD**, y la guarda documental lo cazó — el punto 9 de
`HANDOFF`, cumpliéndose. Siete citas corregidas.

## 6. Regresión

```
Host:        748 / 748  en 98 suites
Contenedor:  129 / 129  (test:guardas)
CI:          los ocho jobs en verde
```

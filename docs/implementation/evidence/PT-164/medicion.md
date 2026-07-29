# PT-164 — La imagen de producción, recortada. Y por qué cambié de opinión.

## PT-161 decidió no hacerlo, y con el dato que tenía era la decisión correcta

Medí **tamaño**: 548 → 531 MB, un 3.1 %. No justificaba tocar una zona que ha tirado cinco
contenedores en tres PT. Lo escribí y lo reverti.

## Lo que cambió: PT-150 midió otra cosa

El escáner de imagen base, ejecutado sobre la imagen real:

```
 0  vulnerabilidades del sistema operativo
16  de npm empaquetado dentro de node:20-alpine     ← no se pueden quitar desde aquí
14  de dependencias de DESARROLLO en la imagen      ← eslint, rimraf, @typescript-eslint, test-exclude
```

**Catorce de treinta las causaba algo que no tiene por qué estar ahí.** Ese dato no existía cuando
decidí revertir. No es «3 % de tamaño»: es **la mitad de la superficie reportada**.

## Y al mirar bien, el bulto no estaba donde creía

La primera pasada (`npm ci --omit=dev` en etapa aparte + `prisma generate` explícito) bajó de 14 a
**11**. Los once restantes estaban todos en `src/packages/core/node_modules`, que la etapa de
producción copiaba **entera** desde el builder.

```
$ src/packages/core/package.json
  dependencies:      (ninguna)
  peerDependencies:  (ninguna)
  devDependencies:   12
  main:              dist/index.js
```

**CORE no necesita `node_modules` en ejecución.** Copiarla completa metía eslint, jest y sus árboles
en producción. Se copian `dist/` y `package.json`, que es lo único que el enlace simbólico necesita.

No se veía porque `packages/core` parece «la librería», no «dependencias de desarrollo».

## Resultado

| | Antes (pt129) | Después (pt164) |
|---|---:|---:|
| Tamaño | 548 MB | **450 MB** (−18 %) |
| Vulnerabilidades del proyecto | 14 | **2** (−86 %) |
| De npm en la imagen base | 16 | 16 (no accionables aquí) |

Las dos que quedan son la misma CVE en `eslint` y `rimraf`, transitivas y no ejecutadas en
producción. Triadas con motivo.

## La aceptación sigue siendo la de PT-129: tiene que ARRANCAR

```
$ docker run … ironloot-api:pt164   →  Up 45 seconds (healthy)
$ docker run … ironloot-api:pt129   →  Up 45 seconds (healthy)     ← control
  "Nest application successfully started"
```

Comprobado **con control**, porque los dos primeros intentos fallaron por `NODE_ENV=production` sin
las credenciales de admin — y la imagen actual fallaba idéntico. Sin ese control habría reportado una
regresión que no existía. Es la segunda vez hoy que el control evita una conclusión falsa.

## Lo que aprendí, y es lo que merece quedar escrito

**Medí la variable equivocada.** «La imagen es más grande de lo necesario» llevaba a medir MB, y con
MB la respuesta era «no compensa». La pregunta útil era otra: *¿qué mete en producción código que no
se ejecuta?* Y la respuesta era 98 MB y el 86 % de los hallazgos.

Revertir PT-161 no fue un error con el dato de entonces. Lo que faltaba era el dato, y lo trajo el
instrumento que se construyó en el PT de al lado.

# PT-238 — Self-Review

**Tipo:** BUG · **Complejidad:** TRIVIAL · **Rama:** `fix/PT-238-tsconfig-raiz-sin-entradas`
**Origen:** el usuario preguntó por qué el editor emitía
`No se encontraron entradas en el archivo de configuración 'tsconfig.json'`.

## Qué se midió antes de tocar nada

El error es `TS18003`, y es **correcto**: TypeScript lo emite cuando un config no tiene entradas y no
declara `files` ni `references`. Se probaron las tres formas posibles con `tsc` real, no de memoria:

| Forma | Resultado medido |
|---|---|
| `include: []` (la que había) | `TS18003 — No inputs were found in config file` |
| `files: []` | `TS18002 — The 'files' list in config file is empty` |
| `include: []` + `references: []` | **sin error** |

`files: []` **no sirve**: cambia un error por otro. Queda escrito en `C4` para que nadie lo intente
como simplificación.

## Por qué existía el problema, que no es lo mismo que un fichero mal escrito

El `tsconfig.json` de la raíz **no compila nada, y es a propósito**. Existe por `ts-node`:
`npm run indice:estado` ejecuta `node --require ts-node/register/transpile-only …` **desde la raíz**, y
ts-node busca ahí sus opciones. Sin él fallaba con `TS5109` en el host y `EROFS` en el contenedor — lo
restituyó `PT-200` después de que un commit de frontend lo borrara, y que su ausencia fuese el descuido
lo dice el propio `.gitignore`, que lo **des-ignora** explícitamente.

Y el `include: []` también es deliberado: si reclamara ficheros, comprobaría el monorepo entero desde
arriba pisando a los cuatro proyectos que sí compilan.

**Así que ni el mensaje ni el diseño estaban mal.** Lo que faltaba era la forma de decirle a TypeScript
«sé lo que hago», que es exactamente lo que `references` significa.

## Impacto de lo que había

Ninguno sobre compilación ni pruebas: `npm run typecheck` delega en los cuatro subproyectos y los cuatro
están limpios. Era **ruido permanente y en la raíz del proyecto**, del tipo que enseña a ignorar los
diagnósticos de TypeScript. Este repositorio ya ha pagado varias veces que un aviso constante deje de
leerse — es la familia de `H-014`, `H-015` y `H-017`: *un mecanismo que no se lee no avisa de nada.*

## Verificación

**RED antes de implementar:** `C2` y `C3` fallaron sobre el fichero anterior; `C1` y `C4` pasaron desde
el principio porque describen lo que ya era correcto.

**Tres comprobaciones después, ninguna por lectura:**

1. `npx tsc --noEmit -p tsconfig.json` → **sin salida** (antes: `TS18003`).
2. `npm run indice:estado` → `188 encabezados · 0 realmente abiertos`. El punto de entrada que motiva
   la existencia del fichero **sigue arrancando**, que era el riesgo real de tocarlo.
3. `npm run typecheck` → los cuatro subproyectos limpios.

**Suites:** 1.193 en API, 93 en core, 23 en BASE, 172 en CLIENT, 13 en ADMIN.

## Un detalle que se comprobó y no se supuso

`tsconfig.json` admite comentarios (JSONC), pero eso sólo vale si **nadie lo parsea con `JSON.parse`**.
Se buscó: los `docker-compose` montan únicamente los `tsconfig` de cada servicio, y nada del repositorio
lee el de la raíz programáticamente. La propia guarda retira los comentarios antes de parsear, y `C3`
comprueba que **siguen ahí** — sin ese caso, borrar la explicación no rompería nada y se perdería el
motivo.

## Checklist

- [x] Criterios verificados ejecutando `tsc`, `indice:estado` y `typecheck`
- [x] Escenarios pasando; sin regresiones
- [x] Sin efectos colaterales: el fichero no participa en ninguna compilación
- [x] `11-Conventions.md` respetado
- [x] Commit atómico trazable a PT-238
- [x] Sin artefactos de depuración
- [x] El motivo queda **en el propio fichero**, no sólo en el registro

## Lo que este PT deja dicho

**Un fichero que existe para una herramienta y no para la otra tiene que decírselo a las dos.** El
`tsconfig` de la raíz llevaba desde PT-200 haciendo bien su trabajo para `ts-node` y emitiendo un error
para `tsc`, y las dos cosas eran ciertas a la vez. La corrección no fue cambiar lo que hace: fue
declararlo.

# Evidencia — PT-091 (TD-012)

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-091-linter-tres-servicios`

## Lo que se encontró, medido antes de tocar nada

| Proyecto | eslint instalado | Declarado | Config | Problemas | Errores |
|---|:-:|:-:|:-:|---:|---:|
| `src/api` | sí | sí | `.eslintrc.js` | 649 | **0** |
| `src/admin` | **no** | **no** | **ninguna** | 1.314 | **762** |
| `src/apps/base` | **no** | **no** | **ninguna** | 137 | **98** |
| `src/apps/client` | **no** | **no** | **ninguna** | 203 | **148** |
| `src/packages/core` | no (ni script) | no | ninguna | 110 | **110** |

Peor de lo que TD-012 describía: no faltaba la configuración, **faltaba la herramienta**. Y aun
así los tres declaraban un script `lint`.

## Desglose: el fondo era minúsculo frente al formato

| Regla | admin | base | client | core |
|---|---:|---:|---:|---:|
| `prettier/prettier` | 761 | 94 | 142 | 102 |
| `no-floating-promises` | 1 | 1 | 1 | — |
| `no-unused-vars` | — | 2 | 4 | — |
| `no-var-requires` | — | 1 | 1 | — |
| errores de parseo | — | — | — | 8 |

Ese desglose **es el entregable de este PT**. Sin él, `--fix` habría sepultado el fondo bajo el
formato.

## El fondo, corregido — y una sorpresa

Las tres promesas sueltas eran `bootstrap();` al final de cada `main.ts`. Parecía un falso
positivo del linter sobre un patrón idiomático de NestJS. **No lo era**: la API hace

```ts
bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
```

y los otros tres, no. Si el arranque fallaba, el rechazo quedaba sin manejar y el proceso podía
sobrevivir en estado roto sin decirlo. Los tres adoptan el patrón de la API.

CORE fallaba al analizar sus 8 `.spec.ts` porque el `tsconfig` de compilación los excluye —y hace
bien, no deben ir al `dist`—. Se añadió `tsconfig.eslint.json` que anula ese `exclude`: pasó de
110 problemas detectados a 333. **223 estaban ocultos.**

## Resultado

```
src/api            649 problemas  (0 errores)   sin cambios
src/admin          552 problemas  (0 errores)   eran 762 errores
src/apps/base       39 problemas  (0 errores)   eran  98
src/apps/client     55 problemas  (0 errores)   eran 148
src/packages/core     0 problemas  (0 errores)   eran 110 (+223 ocultos)
```

Lo que queda son **avisos**, no errores: `no-console`, `explicit-function-return-type`,
`no-explicit-any`. No se tocan aquí.

## El agujero que dejó sobrevivir la deuda

El `pre-commit` hacía `cd src/api` y solo revisaba la API. Por eso cuatro proyectos pudieron
declarar durante meses un script `lint` inservible sin que nadie se enterara. Ahora recorre los
cinco y entra solo en los que el commit toca.

**Autoverificado**: el commit del formato lo ejecutó sobre los cuatro proyectos nuevos.

## Verificación

`typecheck` ok en los cuatro · API **60/406** · CLIENT **5/71** · CORE **8/134**.

## Hallazgo generado

**F-26** — los scripts de la raíz (`test`, `lint:check`, `typecheck`, `build`) solo cubren la API:
`npm test` en la raíz corre 406 tests y omite 205. Y su `postinstall` rompe `npm install` dentro
de cualquier workspace. En la matriz como **PT-099**.

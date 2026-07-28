# PT-138 — Fuera de alcance

## Explícitamente excluido

| # | Qué | Por qué | Dónde va |
|---|---|---|---|
| 1 | **Reescribir cómo los ocho ficheros resuelven `RAIZ`** | Se toca lo mínimo para que funcione en host, contenedor y CI. Refactorizar la familia entera mientras se arregla su entorno hace imposible saber qué arregló qué | PT propio si se quiere unificar |
| 2 | **Qué mide el checkpoint D3** | Este PT cambia de dónde saca el dato y cómo se comporta cuando no lo tiene. El contenido de la métrica es de PT-121 | — |
| 3 | **Rendimiento del bind mount en Windows** | Puede ser lento. Si aparece, se mide y se registra; optimizar no es reparar | Registro, y PT si duele |
| 4 | **Reorganizar los montajes existentes** de `api` | `/app/src`, `/app/test`, `/app/prisma` y `/packages/core` funcionan. Tocarlos es riesgo sin beneficio | — |
| 5 | **Aplicar el mismo montaje a admin, base y client** | Sus guardas no leen la raíz. Cuando alguna lo haga, se extiende | — |
| 6 | **`audit:domain` y `audit:reliability`** | Son métricas de delta sync por decisión de PT-122, con su razón escrita. No corren en CI **a propósito** | — |
| 7 | **Ejecutar la suite de navegador dentro del contenedor** | `tests/qa-browser-suite/` es la excepción declarada a RULE-15: Playwright conduce un navegador real y su lock tiene cero paquetes por plataforma | — |

## Lo que sí entra aunque parezca de otro

- **`SIN_DATOS` con código distinto de cero.** Podría parecer de PT-121, que escribió el checkpoint.
  Entra aquí porque **es la única razón por la que este defecto era invisible**: sin ella, arreglar el
  montaje haría que la métrica funcionara sin que nadie supiera que llevaba semanas sin medir.
- **`security-baseline.json` viajando al contenedor.** Sale gratis con D1 y sin él `audit:check` sigue
  sin poder ejecutarse dentro.
- **Documentar la vía del contenedor desechable.** No arregla nada, y es conocimiento que hoy sólo
  existe en el `DISCOVERY.md` de PT-135.

## Deuda que este PT NO deja

**Cero deuda diferida.** Si al montar la raíz aparece una guarda que falla por otra razón, se
investiga y se abre PT — no se añade a una lista de exclusiones.

## Riesgo aceptado explícitamente

**Montar la raíz expone todo el repositorio al contenedor del API**, incluidos `.env` y `PTSA/`. Es
sólo lectura y es un contenedor de desarrollo local, no una imagen de producción — los `Dockerfile`
de producción no se tocan. Se hace constar porque es un cambio en lo que el contenedor ve, y eso
merece decirse en voz alta en vez de descubrirse después.

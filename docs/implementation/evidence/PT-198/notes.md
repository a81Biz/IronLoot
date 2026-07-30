# PT-198 — Evidencia

## Lo que había, medido

```
routes.md         110 rutas SSR por decorador · el documento nombraba 63
components.md      39 módulos propios · faltaban ThrottlerRedisModule y ThrottlerRedisService
integrations.md    su fuente citaba src/packages/core/src/integrations/ — borrado por PT-193
```

## Después

```
Tests: 12 passed, 12 total     (los SEIS inventarios vigilados)
API:   1115 passed, 138 suites
```

## Las tres guardas nuevas, vistas fallar

| Sabotaje | Qué cae |
|---|---|
| Quitar una ruta de `routes.md` | `C4` |
| Renombrar `ThrottlerRedisModule` en la tabla | `C5` — **tras corregirla**, ver abajo |
| Apuntar la fuente de integraciones a una carpeta inventada | `C6` |

Los tres sabotajes **afirmaron haberse aplicado** antes de correr nada. Es la lección de PT-194: un
sabotaje que no aplica es indistinguible de una guarda que funciona.

## Lo que salió mal, que es tres veces lo mismo

**`C6` acusaba a la nota que explica el arreglo.** Leía los primeros 800 caracteres, y la nota **tiene
que** nombrar `src/packages/core/src/integrations/` para que se entienda por qué se corrigió la fuente.
Ahora lee **sólo la línea `**Source:**`**.

**`C5` no cazó su propio sabotaje.** Leía el documento entero y encontraba `ThrottlerRedisModule` en la
prosa de la nota que dice que faltaba. Verde por leer donde no debía. Ahora lee **sólo filas de tabla**.

**`C4` dejaba fuera tres rutas** del `app.controller.ts` de ADMIN, porque mi generador lo excluyó al
construir el bloque de módulos.

Quinta y sexta vez en la jornada que una guarda caza el texto que la describe. El patrón ya tiene
nombre y ahora también tiene remedio conocido: **una guarda lee lo ejecutable o lo tabular, nunca la
prosa que la explica**.

## Y la limitación que declaré era falsa

`PT-197` dejó escrito que estos tres inventarios *«no son mecánicamente enumerables»*. **Los tres lo
son.** La afirmación sobrevivió un commit entero antes de que la comprobara — y es exactamente la
familia de defecto que estas guardas persiguen, sólo que esta vez la afirmación era mía.

Queda en el registro porque el valor de `HANDOFF.md` depende de que sus «sin guarda» sean ciertos. Uno
falso es peor que no tener la lista.

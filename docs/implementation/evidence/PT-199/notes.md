# PT-199 — Evidencia

> La evidencia completa vive en `PTSA/Hallazgos/H-036.md`, que es donde manda para un hallazgo PTSA.
> Aquí queda el rastro que `RULE-34` pide para el registro de trabajo — y esta nota existe **porque la
> guarda la reclamó**, no porque la previera.

## El checkpoint, antes

```
silent_failure_count = 27   (linea base: 25)
NUEVOS catch que no registran ni relanzan:
  src/apps/client/src/common/bff/reintentar-tras-refresco.ts   (linea 83)
  src/apps/client/src/common/guards/client-auth.guard.ts       (linea 89)
  src/apps/client/src/common/guards/client-auth.guard.ts       (linea 110)
FALLA — hay `catch` nuevos que no dejan rastro.
```

## Después

```
silent_failure_count = 24   (linea base: 25)
OK — sin silencios nuevos.
```

**Por debajo de la línea base**, no sólo dentro.

## Lo que hay que recordar de esto

Los tres `catch` los introduje yo, en PT-194 y PT-196, **en el sitio donde mi propio `design.md`
argumentaba que no los había**. La decisión `D-1` decía que `null` y `throw` son cosas distintas, y el
comentario que puse encima del `catch` afirmaba: *«esa diferencia la registra `refrescarSesion`»*.

`refrescarSesion` **lanza**. No registra. El lanzamiento moría ahí mismo.

**Un comentario que describe la intención no prueba la intención**, y éste llevaba dos PT afirmando algo
que el código no hacía. Lo encontró el checkpoint D3 en el `resume PTSA`, no una lectura del código —
ni la mía al escribirlo, ni la de la autorrevisión.

Es literalmente lo que el mensaje de fallo del checkpoint recuerda: *«F-34: aquel catch TENÍA
comentario, y la puja en vivo estuvo apagada días»*.

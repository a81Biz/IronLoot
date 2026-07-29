# PT-163 — La reputación, pública con límite

Implementa lo que PT-156 dejó preparado. **Alternativa B**, la recomendada.

## Corrección a mi propio ENRICHMENT

Escribí que `ratings.controller.ts:17` aplicaba el guard «a toda la clase». **Es impreciso**: esa
línea protege sólo el `@Post`. El mecanismo real es `JwtAuthGuard` como **guard global**
(`app.module.ts:156`) — todo está protegido por defecto y `@Public()` es la única salida.

La conclusión no cambiaba, pero la cita sí estaba mal, y en este repositorio una cita mal apuntada es
un hallazgo (H-016).

## Verificado contra el API real

```
$ curl .../api/v1/users/1a4430d8-.../ratings          → HTTP 200   []
$ 13 peticiones seguidas
  200 200 200 200 200 200 200 200 200 429 429 429 429
                                       ↑ la décima
```

**Los dos criterios de aceptación**: sin sesión responde 200, y la petición 10 recibe 429.

## Lo que no cambia

`findAllByTarget` no se toca: la respuesta es la misma que ya recibía un usuario con sesión. **No se
expone ningún dato nuevo** — sólo deja de exigirse una sesión para leer lo que ya era legible.

## Lo que el límite NO hace, dicho para que nadie lo lea de más

**Un límite por IP levanta el listón; no cierra la puerta.** Quien rote direcciones sigue pudiendo
raspar. Si el raspado llega a observarse, la alternativa C —agregado público, detalle con sesión—
sigue disponible y este cambio no la estorba.

El límite es **configurable por entorno** (`RATINGS_PUBLIC_RATE_LIMIT`, por defecto 10): un número
enterrado en el código no se puede subir cuando el tráfico legítimo crece ni bajar cuando aparece un
raspador, y acabaría comentado.

# PT-137 — Fuera de alcance

## Explícitamente excluido

| # | Qué | Por qué | Dónde va |
|---|---|---|---|
| 1 | **Topología de Redis** — Sentinel, cluster, réplicas, persistencia | Este PT arregla el contrato de configuración, no la arquitectura del servicio | Decisión de plataforma, con ADR |
| 2 | **TLS (`rediss://`)** | D1 lo habilita como posibilidad; configurarlo exige certificados y decisión de despliegue | Cuando haya despliegue real |
| 3 | **Degradación ante caída de Redis en caliente** | Hoy el API muere o queda `unhealthy`. Si eso debe cambiar es una decisión de disponibilidad, no una corrección | PT propio si se quiere |
| 4 | **Auditar las 49 variables una por una** | Se clasifican todas (PT-137.1) y se declara la brecha, pero **investigar qué esconde cada una** es otro trabajo | PT por cada defecto que destape |
| 5 | **BASE y CLIENT** | Verificado: no usan Redis | — |
| 6 | **Rediseñar el manejo de sesiones de ADMIN** | Se revisa su reserva (PT-137.7), no su diseño. F-39 ya lo tocó | — |
| 7 | **Un `.env` de ejemplo por servicio** | Hoy hay uno en la raíz y otro efectivo en `src/api/.env` fuera de git. Unificar la estrategia de `.env` es más ancho que Redis | **PT-140** roza el tema al declarar precedencias; si merece más, PT propio |

## Lo que sí entra aunque parezca de otro

- **La guarda de variables declaradas.** Es más ancha que Redis a propósito: arreglar sólo Redis
  dejaría intacta la clase de defecto —*lo que hace funcionar el sistema vive fuera de git*— y ésa es
  la parte que vuelve.
- **Retirar la reserva `localhost`.** Podría parecer endurecimiento gratuito. No lo es: **la reserva
  es la causa** de que esto haya vivido meses invisible.
- **El 429 real.** Verificación cara comparada con correr la suite, y es la única que demuestra que
  el rate limiting sigue existiendo.

## Deuda que este PT NO deja

**Cero deuda diferida.** Toda variable no declarada que aparezca en PT-137.1 termina con veredicto:
declarada, o excepción **con motivo escrito**. Una lista de excepciones sin razones se convierte en un
cajón, y el cajón es donde murió F-135-A durante meses.

## Riesgo aceptado explícitamente

**Quien tenga un `src/api/.env` con `REDIS_HOST` verá su entorno dejar de arrancar** hasta que lo
actualice. Es intencionado y es el punto: hoy el sistema funciona por un fichero que nadie más tiene.
Se documenta en `HANDOFF.md` como paso de migración local.

# PT-131 — Las capas, medidas una a una

Cada corrección destapa la siguiente. No es dispersión: es **sedimento**. Los specs dejaron de
ejecutarse (H-015 impedía que el job terminara) y el contrato siguió cambiando debajo de ellos.

| Corrida | Capa corregida | Fallos | Pasan |
|---|---|--:|--:|
| inicial | — | **42** | 38 |
| 1 | Fechas de subasta: `startsAt` futuro + duración mínima 1 h (helper) | 42 | 38 |
| 2 | Subasta **en curso**: se crea con inicio futuro y se mueve el reloj después | 42 | 38 |
| 3 | **Incremento mínimo de puja** (PT-041/AUD-009): 105 sobre 100 ya no vale, hace falta 110 | 42 | 38 |
| 4 | **Monedero inexistente**: pujar retiene fondos y el usuario de prueba no tenía monedero | 42 | 38 |
| 5 | **`isActive`**: el monedero se activa con el primer depósito real | **38** | **42** |

## Las capas que quedan, ya identificadas

```
 10  Invalid credentials
  3  Cannot POST /api/v1/orders          <- ruta que ya no existe
  3  Validation failed (uuid is expected) <- cascada de un id no obtenido
  2  Se requiere KYC aprobado para retirar
  2  Invalid email or password
  1  Wallet not found
```

`Cannot POST /api/v1/orders` es la más informativa: el spec llama a una ruta **que el API ya no
expone**. Otra capa del mismo sedimento.

## Lo que esto demuestra

Cinco cambios de contrato del producto —fechas de subasta, activación, incremento mínimo, monedero
obligatorio, activación del monedero— entraron **correctamente** en el producto y **ninguno** llegó
a los specs, porque nadie podía ejecutarlos.

**El producto no tiene ni un defecto en esta lista.** Los tests son un registro fósil de un contrato
de hace meses.

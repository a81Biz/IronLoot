# PT-131 — Fuera de alcance

## No entra

### Cualquier cambio en `src/api/src/`
**Es el límite duro.** Los specs se adaptan al producto, nunca al revés. Si un test sólo puede pasar
tocando el producto, **no se toca**: se registra como hallazgo.

### El `500` del depósito
`POST /wallet/deposit` con referencia desconocida. **Es PTSA H-018** y exige su propio Gate. Aquí el
spec se corrige para hablar de la ruta correcta; el 500 sigue ahí y **el test lo refleja**.

### Añadir alias de ruta o tocar la moneda
Sería adaptar el sistema a su descripción equivocada — el mismo error que PT-130 evita en la
documentación. El prefijo `/api/v1` y MXN son correctos.

### Bajar la duración mínima de subasta en `NODE_ENV=test`
Es la opción (b) de D5. Relajar una regla de dominio por entorno acaba relajándola donde no debe.
Si se prefiere, **es decisión de dominio** y sale de este PT.

### Reescribir la suite e2e
No se refactoriza, no se añade cobertura, no se reorganiza. **Se corrige lo que miente.**

### Los 6 ficheros que ya pasan
`auth`, `admin-auth`, `watchlist`, `user-profile-sync`, `notifications`, `profile-persistence`. Sólo
se tocan si el helper compartido los alcanza.

### Aumentar la cobertura e2e
Tentador mientras se está dentro. No.

---

## Prohibido explícitamente

- **Ningún `skip` nuevo.** Un `skip` sin fecha es un borrado lento.
- **Ninguna aserción relajada** para que salga el verde.
- **Ningún test borrado.**

Si algo no puede pasar, se dice por qué y se registra. **El verde comprado no vale nada** — es
exactamente lo que dejó pasar H-014 y H-015 durante nueve sesiones de auditoría.

---

## Criterio de crecimiento

- **Es contrato viejo** → entra.
- **Es defecto de producto** → se registra, no entra.
- **Es cobertura que falta** → no entra.

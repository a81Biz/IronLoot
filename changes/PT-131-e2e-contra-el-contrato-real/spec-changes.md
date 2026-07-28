# PT-131 — Cambios de especificación

## API HTTP · Modelo de datos · Contratos de tipos · Eventos

**Ninguno. Y es el límite duro del PT**: cero cambios en `src/api/src/`.

Conviene decirlo porque hay dos tentaciones concretas y muy a mano:

1. Añadir un alias `/wallet/deposit` sin prefijo, para que el spec viejo acierte.
2. Bajar la duración mínima de subasta en `NODE_ENV=test`, para no pelearse con el cierre.

**Las dos se rechazan.** La primera adapta el sistema a su descripción equivocada; la segunda relaja
una regla de dominio por entorno, y una regla relajada por entorno acaba relajada donde no debe.

---

## Contrato de las pruebas — aquí está todo el cambio

| | Antes | Después |
|---|---|---|
| `CreateAuctionDto` en los specs | a mano, 10 veces, con fechas inválidas | un helper compartido, válido según el DTO de hoy |
| Ruta del depósito en `wallet` | `/wallet/deposit` | `/api/v1/wallet/deposit` |
| Moneda esperada en `wallet` | `USD` | `MXN` |
| Subastas que deben cerrar | duración de 2 s (rechazada) | 1 h por la vía pública + `endsAt` adelantado en la base, comentado |

### Por qué el helper y no diez parches

Diez ficheros construyen su subasta a mano. Corregidos uno a uno, el próximo cambio del DTO vuelve a
romper diez ficheros. Con el helper, rompe uno.

**La ventaja no es ahorrar líneas: es dónde duele la próxima vez.**

---

## Efecto en el pipeline

`test-integration` pasa de **rojo** a **verde**, y con él `build` y `docker` se ejecutan **por
primera vez** desde que existe el fichero de CI.

Ese es el entregable real de este PT: no diez ficheros de test arreglados, sino **un pipeline que
produce artefacto verificado**.

---

## Documentación

Ninguna actualización obligada. Si el helper se convierte en la forma canónica de montar escenarios
e2e, merece una línea en `11-Conventions.md` — pero eso se decide cuando exista, no antes.

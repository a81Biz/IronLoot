# PT-131 — Escenarios de prueba

El sujeto de prueba **son las pruebas**. El criterio de aceptación es el resultado de la suite.

---

## Happy path

### E1 — La suite completa en verde

```
prisma migrate deploy && npm run test:e2e
```

**Aceptación**: `Test Suites: 16 passed` · `Tests: 80 passed` · termina **sin** `--forceExit`.
**Hoy**: 10 suites y 42 tests fallando.

### E2 — Crear subasta con el helper da 201

**Aceptación**: **201**.
**Hoy**: **400**, con el DTO que arma cada spec a mano.

### E3 — `build` y `docker` se ejecutan

**Aceptación**: ambos corren.
**Hoy**: no lo han hecho nunca desde que existe `ci.yml`.

---

## Casos de control — obligatorios

### C1 — El helper produce un DTO que el DTO real acepta

Validar contra `CreateAuctionDto` con `class-validator`, **sin HTTP**.

**Aceptación**: cero errores de validación. Y si alguien endurece el DTO en el futuro, **este
control falla el primero** — que es exactamente el punto de tener helper.

### C2 — Cero cambios en el producto

```
git diff --stat master -- src/api/src/
```

**Aceptación**: **vacío**. Si no lo está, o hay un hallazgo registrado que lo justifica, o el PT se
ha salido de su alcance.

### C3 — Cero `skip` nuevos y cero aserciones relajadas

**Aceptación**: el `git diff` no introduce `.skip(`, `xit(` ni `xdescribe(`, y ningún `expect` se
debilita.

**El verde comprado no vale nada.** Es la forma en que H-014 y H-015 sobrevivieron nueve sesiones.

---

## Casos borde

### B1 — Subastas que deben cerrar dentro del test

**Aceptación**: se crean por la vía pública —validaciones incluidas— y **después** se adelanta
`endsAt` en la base, con comentario que explique por qué se salta la validación a propósito.
Es la vía (a) de D5.

### B2 — El `500` del depósito sigue ahí

**Aceptación**: el spec de `wallet` **refleja** el comportamiento real y **no lo maquilla**. H-018
sigue abierto hasta que su propio PT lo cierre.

Si el spec se «arreglara» esperando un 500, estaría **certificando el defecto**. Lo correcto es que
falle o que se marque explícitamente como pendiente de H-018, con la referencia escrita.

### B3 — Aislamiento entre ficheros

Con `--runInBand` y datos compartidos, un fichero puede pisar a otro.
**Aceptación**: si aparece, **se registra**. Puede ser trabajo de otro PT.

---

## Regresión

| Comprobación | Estado esperado |
|---|---|
| `npx jest` (API, unitarios) | **619** verdes |
| `npx jest` (CORE) | **134** verdes |
| `npm run typecheck` | limpio |
| `audit:schema` · `audit:check` · `audit:observability` | en línea base |
| `git diff -- src/api/src/` | **vacío** |

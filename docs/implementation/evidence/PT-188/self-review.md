# PT-188 — Autorrevisión (FDGE STATE 5)

**Fecha**: 2026-07-29 · **Rama**: `docs/PT-188-documentacion-al-dia`
**Cierra**: la deuda documental de la jornada — y una que llevaba meses

---

## Checklist

- [x] **Se midió antes de escribir.** No se supuso que la documentación estuviera al día: se comparó contra el
      código. El resultado justificó el PT — **73 rutas sin documentar y 6 documentadas que no existen**.
- [x] **Escenarios pasando.** 7 casos de la guarda nueva, suite completa **992 / 122 suites**, 151 pruebas de
      documentación.
- [x] **La guarda se vio fallar en las dos direcciones**: quitando una ruta del inventario y añadiendo una
      fantasma.
- [x] **Commits atómicos**, trazables a PT-188.
- [x] **Documentación al día**: 12 ficheros, listados en `HISTORY.log`.

---

## Lo que encontré, y no era lo que esperaba

Esperaba añadir lo de la jornada. Lo que había era **documentación que decía cosas que el código dejó de hacer**:

| Documento | Decía | Es |
|---|---|---|
| `inventory/endpoints.md` | 86 rutas, incluida `/users/settings` | **159**, y esa ruta **no existe** — es la fantasma de H-020 |
| `inventory/entities.md` | «Total models: 27» | **33** |
| `Catalogo-de-API.md` | «~118 endpoints», ADMIN «~61» | **159** y **80** |
| `Catalogo-Maestro-de-Reglas.md` `RN-64` | El holdback se libera «cuando el pedido está DELIVERED» | Ése **era el defecto**: el vendedor liberaba su propio dinero |
| `Master-Test-Plan.md` | «frontends: 0 suites, ninguna» | **3 suites, 119 casos** |
| Registro Maestro de ADR | Se quedaba en ADR-049 | Faltaban **seis** decisiones de la jornada |

**La peor es `RN-64`.** No estaba incompleta: describía **el comportamiento defectuoso como si fuera la regla de
negocio**. Alguien que leyera el catálogo para entender la liberación del holdback habría entendido justo lo que
PT-174 tuvo que corregir.

**Y la de `endpoints.md` es la que más enseña**: H-020 costó que la página «Configuración» no cargara para nadie,
con un error que mandaba a mirar el identificador. El código se arregló hace meses. **El documento que un agente
lee para saber a dónde llamar siguió diciendo la ruta equivocada** — y eso es cómo H-020 vuelve.

---

## Dónde estaba la causa

`11-Conventions.md` tiene guarda. `10-Technical-Debt.md` tiene guarda. **Los seis inventarios no tenían
ninguna.** No es casualidad que sean los que se desviaron.

Ahora `endpoints.md` la tiene, en las dos direcciones. **Los otros cinco siguen sin ella**, y está escrito en el
README en vez de dejarlo implícito.

---

## Lo que no salió como estaba planeado

**1. Intenté deducir el nivel de autorización de cada ruta y lo retiré.** Tres versiones, tres resultados
distintos:

| Versión | Qué falló |
|---|---|
| 1ª | Ventana de ~900 caracteres hacia atrás: heredaba los decoradores del método de arriba |
| 2ª | Sólo miraba **encima** del verbo: `POST /auth/register` salía como `JWT` **teniendo `@Public()`**, porque aquí va debajo |
| 3ª | Detectó `@Public()` de clase pero no que `admin.controller.ts` lo declara **junto a** `@UseGuards(AdminDualAuthGuard)` — dio por **públicos los ochenta endpoints de administración** |

La cuarta funciona, pero **la retiré del código permanente**. Un inventario que se lee para saber qué está
protegido no puede apoyarse en una heurística que ya falló tres veces con el módulo de más privilegio del sistema.
La columna se cura a mano —19 controladores— y la guarda comprueba **sólo lo que se mide sin ambigüedad**: qué
rutas existen. **Prometer menos y cumplirlo es mejor que una guarda que a veces miente.**

Es la quinta vez en la jornada que un instrumento mío medía otra cosa que la que decía medir. La diferencia es que
esta vez la conclusión fue **reducir el alcance de la promesa** en vez de seguir afinando el parser.

**2. Decidí no duplicar la lista de 159 en `docs-v2`.** El catálogo describe guard y límite por familia y apunta
al inventario. Copiarla habría recreado exactamente el defecto que **ADR-049** corrigió: dos árboles con la misma
información, cada PT pagando la escritura doble y la divergencia garantizada.

---

## Lo que este PT NO afirma

- **Que toda la documentación esté verificada.** Se midieron los seis inventarios, el registro de ADR, el
  catálogo de reglas, el de API, el plan de pruebas y el de CI. **`docs-v2/1-negocio`, `2-producto`,
  `3-arquitectura` y `7-ux` no se han contrastado contra el código** en este PT.
- **Que los cinco inventarios sin guarda estén al día mañana.** Hoy lo están porque se midieron. Nada lo
  mantiene.
- **Que la columna de autorización sea infalible.** Está curada a mano contra el guard de cada controlador, y eso
  es más fiable que la heurística — pero no lo verifica ninguna prueba, y se dice.

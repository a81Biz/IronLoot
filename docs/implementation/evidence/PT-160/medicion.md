# PT-159 / PT-160 / PT-162 — Evidencia

## PT-160 era «cambiar `style.display` por `classList`». No era eso.

Al abrir el fichero apareció algo mayor: **el modal de rechazo no funcionaba en absoluto.**

`pages-moderation.js` definía `openRejectModal` y `closeRejectModal` como funciones sueltas. La
plantilla las invoca con `data-accion="abrir-rechazo"` / `"cerrar-rechazo"`, y el puente es
`window.accionesAdmin`, que `ui-behaviours.js` consulta. **Nadie lo rellenaba.**

Medido: **las tres acciones declaradas en todo ADMIN estaban muertas.**

```
$ grep -rho 'data-accion="[^"]*"' src/admin/views/ | sort -u
data-accion="abrir-rechazo"     moderation.html      → el botón «Rechazar» no abría nada
data-accion="cerrar-rechazo"    moderation.html
data-accion="conciliar"         reconciliation.html  → el botón no consultaba nada

$ grep -rn "accionesAdmin" src/admin/public/js/pages/
(vacío)
```

En el panel que aprueba y rechaza subastas.

**Por qué era invisible:** `ui-behaviours.js` comprueba `typeof accion === 'function'` antes de
llamar y **calla** si no la encuentra. Es lo correcto —una acción sin registrar no debe reventar la
página— y es exactamente lo que hace que el fallo no deje rastro: sin excepción, sin log, sin nada en
consola. Sólo un botón que no responde.

**La causa de fondo:** PT-096 sacó el JS de las plantillas para retirar `'unsafe-inline'` de la CSP y
lo movió **«tal cual»**, negándose con razón a mezclar mudanza con cambio de comportamiento. Pero
«tal cual» dejó fuera los `onclick=` que cableaban esas funciones, porque vivían en el HTML y no en
el `<script>`. **Una mudanza fiel al código puede perder el cableado.**

PT-139 encontró dos controles muertos por lo mismo y los corrigió **sin escribir el mecanismo**. Por
eso quedaban tres. Ahora hay mecanismo: **RULE-30**.

### La guarda, vista fallar de verdad

```
$ (quito la línea que registra `conciliar`)
✕ C1: ninguna accion declarada se queda sin manejador
  + "conciliar (declarada en /src/admin/views/pages/reconciliation.html) no la registra ningun script"
$ (la restauro)
Tests: 6 passed
```

## PT-159 — medido, no supuesto

El objetivo era que `npx jest` **sin flags** pasara, que es como falla hoy.

| | Antes | Después |
|---|---|---|
| `npx jest` (por defecto) | 3 suites SIGKILL, «4 failed» | **811 en 105 suites** |
| `--maxWorkers=2` | SIGKILL | — |
| `--runInBand` | pasaba | pasa |

`maxWorkers: 1` fijado en la configuración, con el porqué escrito al lado. **No en una nota**: fue una
prevención que se quedó en una nota lo que hizo volver a H-014 en cuatro días.

### Un segundo defecto encontrado aquí

`test:guardas` filtraba por `rutas-que-el-client`, y **PT-148 renombró ese fichero esa misma
mañana**. El patrón ya no casaba con nada: el guion de guardas había dejado de cubrir esa guarda, en
silencio. Corregido a `rutas-que-los-ssr`. Es RULE-26 otra vez — un mecanismo que no se ejecuta no
avisa de nada, y aquí lo rompí yo cuatro horas antes.

## PT-162 — el duplicado del catálogo

Dos `UserResponseDto` con esquemas distintos: `auth/dto/auth.dto.ts:236` y
`users/dto/user-response.dto.ts:56`. Swagger lo avisaba en cada arranque, con fecha de caducidad
puesta: *«will throw an error in the next major version»*.

Se renombra el de `auth` a `AuthUserResponseDto` —es específico de autenticación; el otro es la
representación general— en sus 4 ficheros. El de `users` no se toca.

## Y H-016, ocurriendo en vivo

Añadir dos líneas a `package.json` desplazó dos citas del TRD, que pasaron a aterrizar en `},` y
`"engines": {`. **La guarda de PT-130 lo cazó en la misma corrida.** Reapuntadas a `:156` y `:157`.

Es la demostración más limpia de por qué existe esa guarda: no hizo falta que nadie sospechara nada.

## Suite

```
$ docker compose exec api npx jest --no-coverage      ← sin flags, a propósito
Test Suites: 105 passed, 105 total
Tests:       811 passed, 811 total
```

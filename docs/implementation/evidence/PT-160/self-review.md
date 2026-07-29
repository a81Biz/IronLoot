# PT-159 / PT-160 / PT-162 — Self-Review

- [x] PT-160 **creció con motivo**: el paquete decía «funciona hoy, pero es el patrón contra el que
      avisa RULE-19». No funcionaba. Corregirlo entero estaba dentro del alcance declarado —*«si
      aparecen defectos, se corrigen dentro del PT»*— y dejarlo a medias habría sido peor.
- [x] Guarda nueva (RULE-30) **vista fallar contra el defecto real**, no sólo en su caso de control.
- [x] RULE-30 escrita en `11-Conventions.md`; RULE-27 me acusó por citarla antes. Segunda vez hoy.
- [x] PT-159 medido en las tres configuraciones, no supuesto.
- [x] PT-162 sin cruces: `auth/` no importa el DTO de `users/`, comprobado.
- [x] `npx jest` sin flags: 811/811 en 105 suites.

## Lo que rompí yo y detectó el mecanismo

**Dos cosas mías, las dos cazadas por guardas de esta misma semana:**

1. `test:guardas` apuntaba a `rutas-que-el-client`, que **renombré en PT-148 cuatro horas antes**. El
   guion había dejado de cubrir esa guarda en silencio. No lo cazó ninguna prueba — lo vi al leer el
   `package.json` para PT-159. **Eso significa que sigue sin haber mecanismo** para los patrones de
   `test:guardas`, y lo dejo dicho en vez de fingir que está cerrado.
2. Añadir dos líneas a `package.json` desplazó dos citas del TRD. La guarda de PT-130 lo cazó en la
   misma corrida.

El segundo es el sistema funcionando. El primero es un hueco real que sigue abierto.

## Lo que no cubre RULE-30

Sólo mira ADMIN. BASE y CLIENT no usan `data-accion` hoy, así que ampliarla sería escribir para un
caso que no existe — pero si mañana lo usan, la guarda **no avisará de que no los mira**. Es el mismo
tipo de hueco que PT-148 vino a cerrar para las rutas.

## Estado

`VALIDATION_PENDING`. **H-023 → `CORREGIDA`** (`[R44]`).

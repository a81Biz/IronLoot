# PT-119 — Self-Review

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-119-nodemailer-duplicado` · **Estado**: VALIDATION_PENDING

## Checklist FDGE STATE 5

- [x] **¿Criterios verificados?** Una sola copia de `nodemailer` en el árbol; 27 → 26 avisos.
- [x] **¿Efectos colaterales?** `npm test` 492 (API) + 103 (CLIENT). Suite 176/176 (PayPal aparte).
- [x] **¿Commit atómico?** Uno.
- [x] **¿Documentación actualizada?** TD-015 corregida y línea base regenerada.

## Lo que este PT es en realidad: una corrección mía

TD-015 afirmaba que **los 13 paquetes exigían salto de versión mayor**. Al volver a medirlo
—después de que PT-116 cambiara el árbol— resultó que `nodemailer` no.

Heredé el marco de PT-110 y no lo volví a comprobar cuando las condiciones cambiaron. **Es lo mismo
que F-33**: una afirmación que fue cierta, dejó de serlo, y nadie la revisó.

## El detalle que lo hacía invisible

La aplicación ya estaba en `nodemailer@9.0.3`, fuera del rango vulnerable. El aviso venía de una
**segunda copia en 8.0.5**, anidada tres niveles abajo:

```
@nestjs-modules/mailer@2.3.7
  └── preview-email@3.3.0
        └── mailparser@3.9.8
              └── nodemailer@8.0.5    ← esta
```

Mirar la versión de la dependencia directa decía «9.0.3, correcto». Sólo `npm ls` enseña las dos.

## Un tropiezo

Un `override` a `>=9.0.1` falló con `EOVERRIDE`: conflicto con la dependencia declarada. La sintaxis
correcta es `$nodemailer` — referenciar la versión de la dependencia directa en vez de repetirla, y
así no pueden divergir.

## Lo que NO se hizo

Los **12 restantes** exigen saltos mayores de verdad: `@nestjs/core` 10→11, Express 4→5, `bcrypt`
5→6, `uuid` 13→14 y cinco utilidades transitivas. Eso es una **migración de plataforma**, no un
parcheo, y merece su propia decisión.

Desde PT-118 están **acotados**: el checkpoint del CI falla si aparece el número 13.

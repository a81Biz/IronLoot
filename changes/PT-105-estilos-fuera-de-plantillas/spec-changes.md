# PT-105 — spec-changes.md

| Documento | Cambio |
|---|---|
| `10-Technical-Debt.md` | **TD-014 cerrada** con cita (RULE-08). Y TD-005 pasa de «cerrada para `script-src`» a cerrada del todo |
| `11-Conventions.md` | RULE-09: los estilos viven en el CSS, no en el marcado. Delta Log |
| `CLAUDE.md` | La nota de seguridad menciona que la CSP ya no lleva `unsafe-inline` en ninguna directiva |

## Regla propuesta

> **RULE-09 — Un estilo vive en el CSS, no en el marcado.**
>
> Nada de `style="…"` en una plantilla. La CSP de los tres sitios no lo permite desde PT-105, así
> que un atributo nuevo **no se aplicaría**: el navegador lo bloquea en silencio y el elemento se
> ve mal sin que nada avise. Es el mismo silencio de F-34, en otra directiva.
>
> Para mostrar y ocultar desde JavaScript, `classList`, no `style.display = ''`. Vaciar la
> propiedad devuelve el elemento *a lo que diga el CSS*, que ahora puede ser «oculto» — cuatro
> pestañas de ADMIN se rompían justo por ahí.
>
> Lo vigila `src/apps/client/test/estilos-fuera-de-plantillas.spec.ts`.

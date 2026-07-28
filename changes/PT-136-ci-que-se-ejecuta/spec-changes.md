# PT-136 — Cambios de especificación

## `.github/workflows/ci.yml`

| Antes | Después |
|---|---|
| `push: branches: [dev, qa, prep, prod]` | `push: branches: [master]` |
| `pull_request: branches: [dev, qa, prep, prod]` | `pull_request: branches: [master]` |
| — | `workflow_dispatch:` |

**Los `needs` no se tocan.** `test-unit`/`test-integration` siguen colgando de `lint`; `build` de los
dos; `docker` de `build`. Los tres checkpoints (`security-audit`, `schema-drift`, `observabilidad`)
siguen **sin `needs`**, por la decisión de PT-128 (H-015), que este PT no revisa.

## `CLAUDE.md`

**§ Checkpoints de auditoría** — se añade una frase al bloque que ya explica por qué los tres van sin
`needs`:

> El workflow dispara en **`master`** y admite ejecución manual (`workflow_dispatch`). Declarar en el
> disparador una rama que no existe deja el pipeline entero sin ejecutarse **sin dar ningún error**:
> es lo que le pasó a este repositorio desde el primer día (PT-136). Lo vigila
> `ramas-del-disparador-existen.spec.ts`.

Y se añade a la lista de guardas:

```
npm run test -- ramas-del-disparador-existen   # toda rama del `on:` existe en el remoto
```

## `docs/implementation/HANDOFF.md`

- «los siete jobs» → **ocho**, con la lista nombrada.
- § *Lo que falta para cerrar PT-135*: el punto 1 («empujar `master`») se retira — **ya estaba
  empujado**; el punto 2 (criterio 10) pasa a depender de este PT y se cierra en PT-136.9.

## `docs/implementation/PENDING_TASKS.md`

- La nota de PT-135 (`:29-34`) corrige «los siete jobs» y retira «falta empujar `master`».
- **El resto de las incoherencias de este fichero son de PT-140**, no de aquí. Se tocan sólo las dos
  líneas que este PT deja obsoletas.

## Nueva regla de convenciones

`docs/enterprise-documentation/11-Conventions.md` — **RULE-16**:

> **Toda rama nombrada en el disparador de un workflow tiene que existir en el remoto.**
> Un `on: push: branches: [x]` con `x` inexistente no es un error de sintaxis: GitHub acepta el
> fichero, lo lista como `active`, y **el workflow no se ejecuta nunca**. Este repositorio vivió así
> desde el primer día: ocho jobs escritos, tres checkpoints declarados «vigilados en CI», y **cero
> ejecuciones** (PT-136). Corolario del mismo principio que H-014, H-015 y H-017: *un mecanismo que
> no se ejecuta no avisa de nada*.
> Lo vigila `ramas-del-disparador-existen.spec.ts`.

## Lo que este PT NO especifica

- Ningún cambio de contrato de API, de datos, ni de comportamiento observable.
- Ninguna variable de entorno nueva.
- Ningún job nuevo. El escáner de imagen base sigue siendo **TD-016**, sin PT asignado.

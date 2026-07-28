# PT-130 — Cambios de especificación

## API HTTP · Modelo de datos · Contratos de tipos · Eventos

**Ninguno.** No se toca una línea de código de aplicación.

Merece decirse explícitamente: la tentación aquí es «arreglar» el 404 de `/health` añadiendo un
alias fuera del prefijo global, para que `CLAUDE.md` acierte. **No se hace.** El prefijo es
correcto; lo que está mal es el documento. Adaptar el sistema a su descripción equivocada es el
mismo error en dirección contraria.

---

## Documentación — el cambio real

### `docs/enterprise-documentation/03-TRD.md:13`

```diff
- | NestJS | ^10.3.0 | `src/api/package.json:36` |
+ | NestJS | ^11.0.0 | `src/api/package.json:36` |
```

Más lo que salga del barrido (PT-130.1): Express 4 → 5 en la misma tabla, si figura.

### `docs/enterprise-documentation/06-Backend-Architecture.md:9-13`

```diff
- ├── api/    — Main REST API + WebSocket server (NestJS 10, port 3000)
- │   ├── base/   — Public SSR site (NestJS 10, port 5174)
- │   └── client/ — Private SSR portal (NestJS 10, port 5175)
- ├── admin/  — Admin backoffice (NestJS 10, port 3001)
+ (los cuatro, NestJS 11)
```

### `CLAUDE.md:138`

```diff
- | `health` | `/health` and `/health/detailed` endpoints |
+ | `health` | `/api/v1/health` and `/api/v1/health/detailed` endpoints |
```

**Cambio mínimo y acotado a esa fila.** `CLAUDE.md` es instrucción vinculante para todo agente que
trabaje en este repositorio: nada más de ese fichero entra en este PT.

---

## Contrato de pruebas

### Guarda nueva

`src/api/test/unit/documentacion/coherencia-documentacion-codigo.spec.ts`

Comprueba **dos clases de afirmación y ninguna más**:

| Clase | Cómo | Contra qué |
|---|---|---|
| Versión de dependencia **citada** | lee la cita `fichero:línea` de la tabla | el `package.json` citado |
| Ruta HTTP documentada | busca rutas en los documentos del alcance | el prefijo global de `main.ts` |

**Sin cláusula de escape**: si falta un documento del alcance, **falla**. La razón por la que
`coherencia-deuda-tecnica.spec.ts` sí la tiene —`docs/` estaba en `.gitignore`— **ya no se
cumple**: H-009 se corrigió y los cinco están seguidos por git.

### Guarda existente, revisada

`coherencia-deuda-tecnica.spec.ts` conserva la cláusula de escape por una premisa obsoleta. Se
decide: o se le quita, o se escribe por qué se conserva. **Las dos respuestas valen; dejarlo sin
decidir, no.**

### Recuento de pruebas

```
antes:  83 suites / 603 tests
despues: 84 suites / 604 tests   (mínimo; el barrido puede añadir casos)
```

---

## `audit-scope.yaml`

Sin cambio necesario: los cinco documentos ya están en `coverage_targets.docs` y los patrones
auditables ya los cubren. Se anota en la sesión PTSA que **D4 pasa a tener guarda ejecutable**, que
es lo que hasta hoy no tenía.

---

## Lo que este PT hace visible

Que **una afirmación sin cita no es verificable**, y por tanto la guarda no la mira. Es una
limitación real y conviene que esté escrita: quien quiera que un dato de la documentación quede
protegido, tiene que citarlo. Eso convierte la convención de citar fuentes en algo que da beneficio,
no sólo trabajo.

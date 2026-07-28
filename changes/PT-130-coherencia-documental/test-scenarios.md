# PT-130 — Escenarios de prueba

**Criterio rector**: la guarda tiene que **verse fallar antes de verse pasar**. Si se corrigen los
documentos primero, nace en verde y nadie sabrá nunca si detecta algo. Es el defecto de H-015 y
H-017 aplicado a una prueba.

---

## Happy path

### E1 — La guarda falla con la documentación de hoy

```
npx jest --testPathPattern="coherencia-documentacion-codigo" --no-coverage
```

**Aceptación**: **falla** (RED), nombrando al menos:
- `03-TRD.md:13` — declara `^10.3.0`, `package.json` dice `^11.0.0`
- `06-Backend-Architecture.md` — «NestJS 10» ×4
- `CLAUDE.md:138` — `/health`, que no existe

### E2 — La guarda pasa con la documentación corregida

Misma orden, tras PT-130.3 y PT-130.4.

**Aceptación**: **pasa** (GREEN).

### E3 — La ruta corregida es la real

```
curl -o /dev/null -w "%{http_code}"  http://localhost:3000/api/v1/health
curl -o /dev/null -w "%{http_code}"  http://localhost:3000/health
```

**Aceptación**: **200** y **404** respectivamente. Se comprueba contra el sistema en marcha, no
sólo contra el texto.

---

## Casos de control — **obligatorios**

### C1 — Detecta una versión desactualizada

Devolver `^10.3.0` al TRD. **Aceptación**: **falla**. Revertir → pasa.

### C2 — Detecta una ruta que no existe

Devolver `/health` a `CLAUDE.md`. **Aceptación**: **falla**. Revertir → pasa.

### C3 — Detecta una cita rota

Cambiar la cita de `src/api/package.json:36` a un fichero inexistente.
**Aceptación**: **falla** diciendo que la fuente citada no existe. Una cita que no se puede seguir
es tan mala como una cita que miente.

### C4 — No acusa a la prosa

Reescribir un párrafo descriptivo de `02-PRD.md` sin tocar ninguna versión ni ruta.
**Aceptación**: **pasa**.
Este control protege la decisión D1: una guarda con falsos positivos acaba borrada, y con ella lo
que sí protegía. Es la lección literal de PT-103.

### C5 — Falla si falta un documento del alcance

Renombrar temporalmente `03-TRD.md`.
**Aceptación**: **falla**, no se salta.
**Hoy** `coherencia-deuda-tecnica.spec.ts` sí se saltaría — por una premisa (`docs/` gitignored) que
**ya no se cumple**.

---

## Casos borde

### B1 — Rango de versión frente a versión exacta

`^11.0.0` en `package.json`, «NestJS 11» en prosa.
**Aceptación**: coinciden. La guarda compara la **mayor** cuando el documento no da más precisión, y
la cadena completa cuando sí la da (`^11.0.0`).

### B2 — El mismo paquete citado desde varios documentos

**Aceptación**: se comprueban todas las citas, no la primera.

### B3 — Documento sin ninguna afirmación contrastable

`09-Security-Architecture.md` podría no tener ninguna.
**Aceptación**: pasa, sin error. **Y se anota en la salida**: un documento con cero afirmaciones
comprobables no está protegido, y conviene que se sepa en vez de aparentar cobertura.

### B4 — Una ruta documentada que sí existe fuera del prefijo

Los webhooks públicos podrían estar fuera del prefijo global.
**Aceptación**: la guarda **no acusa** si la ruta existe de verdad. Compara contra las rutas reales,
no contra la suposición de que todo lleva prefijo.

---

## Casos de error

### F1 — `package.json` ilegible

**Aceptación**: falla con el error de lectura. Nunca un verde silencioso.

### F2 — La cita apunta a una línea que ya no existe (fichero más corto)

**Aceptación**: falla diciendo que la línea citada está fuera de rango.

---

## Regresión

| Comprobación | Estado esperado |
|---|---|
| `npm run typecheck` | limpio |
| `npx jest` (API) | **84 suites / 604 tests** (83/603 + la guarda) |
| `npx jest` (CORE) | 8 / 134 |
| `coherencia-deuda-tecnica.spec.ts` | verde, con su cláusula de escape resuelta (PT-130.7) |
| `CLAUDE.md` | diff revisado línea a línea: **sólo** la fila del `health` |
| Código de aplicación | **cero cambios** |

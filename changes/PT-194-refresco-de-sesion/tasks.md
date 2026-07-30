# PT-194 — tasks.md

**Tests-first.** Cada tarea que toca comportamiento escribe su prueba en RED antes que el código.
Estado inicial de todas: `PENDING`. **Las once cerradas el 2026-07-30.**

---

### PT-194.1 — La pieza que refresca
**Objetivo**: `common/auth/refrescar-sesion.ts` — único sitio del CLIENT que llama a `/auth/refresh`.
**Entradas**: `refreshToken`, `API_URL`, tope de espera.
**Salidas**: `Tokens` · `null` (sesión muerta) · `throw` (el API no contestó).
**Validación**: prueba unitaria con `fetch` doblado — 200 → tokens; 401 → `null`; timeout → lanza.
**Estado**: DONE

### PT-194.2 — Deduplicación en vuelo
**Objetivo**: `Map<refreshToken, Promise>`; las llamadas simultáneas comparten la promesa.
**Validación**: **cinco** llamadas concurrentes con el mismo token → el `fetch` doblado se invoca
**una** vez (`CA-7`, `E-2`). Y con **dos tokens distintos** → **dos** llamadas: agrupar por usuario
sería incorrecto.
**Estado**: DONE

### PT-194.3 — Tope de espera
**Objetivo**: `AbortSignal` con el valor de consulta (D-6).
**Validación**: un `fetch` que nunca resuelve hace que `refrescarSesion` **lance** antes del tope + 1 s,
no que cuelgue.
**Estado**: DONE

### PT-194.4 — El guard refresca, y sólo ante expiración
**Objetivo**: reescribir el flujo de `ClientAuthGuard` según D-3.
**Validación**, cinco casos:
- token expirado + refresh válido → **continúa**, cookie nueva escrita (`CA-1`, `CA-3`);
- token expirado + sin cookie de refresco → login, **cero** llamadas al API (`CA-5`);
- token expirado + refresco `null` → **las dos** cookies borradas + login (`CA-4`);
- **token con firma inválida** → login **sin llamar** a `refrescarSesion` (`CA-11`);
- token válido → **cero** llamadas a `refrescarSesion` (`E-1`).
**Estado**: DONE

### PT-194.5 — El token nuevo llega a `apiGet` de la misma petición
**Objetivo**: el guard actualiza `req.cookies.access_token` tras refrescar (D-4).
**Validación**: con token expirado, un controlador doblado lee de `req.cookies` **el token nuevo**.
Es la tarea que evita la página en blanco.
**Estado**: DONE

### PT-194.6 — `apiGet` deja de confundir 401 con «sin datos»
**Objetivo**: registrar el motivo; **no** se cambia la firma (28 usos).
**Validación**: un 401 deja traza distinguible de un 404 o de una respuesta vacía.
**Estado**: DONE

### PT-194.7 — El proxy reintenta una vez
**Objetivo**: `selfHandleResponse` + `responseInterceptor` según D-5.
**Validación**:
- 401 + refresh válido → **200** tras un reintento, cookie escrita (`CA-2`);
- 401 + refresco fallido → **401** al navegador, sin redirección;
- **401 tras el reintento** → 401, y **no** un segundo intento.
**Estado**: DONE

### PT-194.8 — El proxy no rompe lo que ya funcionaba
**Objetivo**: prueba de regresión de `selfHandleResponse`.
**Validación**: una respuesta **200** normal atraviesa el proxy **idéntica** —cuerpo y cabeceras— y una
**404** también (`E-3`). Es el riesgo real de D-5: el cambio afecta a **toda** respuesta, no sólo a los
401.
**Estado**: DONE

### PT-194.9 — `vida-de-sesion.ts` en el CLIENT
**Objetivo**: copiar el módulo (D-7) con la nota de duplicación consciente.
**Validación**: la cookie nueva del guard lleva `maxAge = VIDA_ACCESO_MS`; ambos sitios leen la misma
variable de entorno.
**Estado**: DONE

### PT-194.10 — Guarda: el refresco no puede convertirse en una vía de escape
**Objetivo**: `src/api/test/unit/seguridad/refresco-no-relaja-la-verificacion.spec.ts`.
**Validación**: falla si `refrescarSesion` se invoca desde una rama que no sea la de expiración; falla
si el guard deja de borrar las dos cookies ante un refresco fallido. **Con casos de control en los dos
sentidos**, y **vista fallar** con sabotaje dirigido antes de darla por buena.
**Estado**: DONE

### PT-194.11 — Evidencia y registros
**Objetivo**: la carpeta de evidencia de este PT, con la ejecución real —una sesión que sobrevive a la expiración, medida,
no supuesta—, `self-review.md`, entrada en `HISTORY.log` (`VALIDATION_PENDING`: es FEATURE pero toca el
camino de autenticación), `TD-025` cerrada, `PENDING_TASKS` y `HANDOFF`.
**Estado**: DONE

---

## Orden

**1 → 2 → 3** (la pieza y sus garantías) · **9** (configuración) · **4 → 5** (navegación) ·
**7 → 8** (llamadas del navegador) · **6** (observabilidad) · **10** (guarda) · **11** (registros).

**8 no es opcional ni va al final por poco importante**: va inmediatamente después de 7 porque es la
que dice si `selfHandleResponse` rompió algo, y cuanto más tarde se descubra, más cambios habrá encima.

---

> **Nota sobre la redacción de PT-194.11.** Nombra su carpeta de evidencia **sin escribirla como ruta**
> a propósito: `evidencia-citada-esta-en-git.spec.ts` (RULE-31, `C4`) exige que toda carpeta citada
> **exista**, y la de este PT no existirá hasta que se implemente. Acusó a este fichero y tenía razón.
>
> Se reformula en vez de crear una carpeta vacía —una carpeta de evidencia sin evidencia es una
> afirmación falsa— y en vez de excluir `changes/` de la guarda, que sería bajar el listón para que
> encaje lo que escribí. **Quinta vez en la jornada que una guarda caza el texto que la describe.**

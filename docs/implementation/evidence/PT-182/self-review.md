# PT-182 — Autorrevisión (FDGE STATE 5)

**Fecha**: 2026-07-29 · **Rama**: `fix/PT-182-controles-que-aparentan`
**Cierra**: H-029 (D2, MEDIA) · H-030 (D1, ALTA) · H-031 (D2, MEDIA)

---

## Checklist

- [x] **Criterios de aceptación verificados.** Los tres hallazgos tenían su «Corrección esperada» escrita en
      su ficha, y las tres se cumplen: el guard falla cerrado en todas las salidas menos una; el reenvío
      envía de verdad y **propaga el fallo**; la reserva del compose es el valor protegido.
- [x] **Escenarios pasando.** 21 casos en tres guardas (`recaptcha-falla-cerrado` 7 · `reenvio-de-verificacion`
      4 · `liberacion-de-liquidacion` 10, con C7 nuevo). Suite completa **946 / 116 suites** en verde.
      `typecheck` limpio.
- [x] **Sin efectos colaterales.** Inyectar `EmailService` en `UsersService` **rompió tres módulos de prueba**
      que no lo proveían; los tres arreglados. Y se comprobó el **arranque real** del API, que es lo único que
      demuestra que el grafo de módulos resuelve: `Nest application successfully started`, `/health` 200.
- [x] **`11-Conventions.md` respetado**, y ampliado: H-031 es un corolario de **RULE-17** — el valor por
      defecto de una variable que carga una regla de negocio no puede ser el desprotegido.
- [x] **Commits atómicos**, con convención y trazables a PT-182.
- [x] **Sin artefactos de depuración.** Y se retiraron **dos `TODO` que sobrevivieron al trabajo que los
      resolvía** (Redis en `health.service.ts`, hecho en PT-178; estadísticas en `users.service.ts`, que ya se
      calculan). Es la forma pequeña de F-33.
- [x] **Documentación al día**: HISTORY, PENDING_TASKS, HANDOFF, `.env.example`, las tres fichas de hallazgo,
      E-034, E-035, RESUMEN, ESTADO_ACTUAL, AUDIT_LOG, score-history, F5 § U-009, F6 § U-009.

---

## Lo que no salió como estaba planeado

**1. H-031 no existía al empezar.** Apareció comprobando el arreglo de H-030, mirando los valores por defecto
de las reglas de negocio. Y lo introduje yo mismo unas horas antes, en PT-174.

Se registró como **hallazgo con número** en vez de mencionarlo en la prosa de una evidencia. El criterio:
**el recuento es lo que se lee.** Un defecto contado en prosa no está contado.

**2. La guarda de H-031 tenía el defecto que venía a vigilar.** C7 contaba `..` a mano para llegar a la raíz
del repositorio; dentro del contenedor eso da `/docker-compose.yml` y el caso fallaba por no encontrar el
fichero. Habría quedado como una guarda que existe y no vigila nada — el modo exacto en que un control se
vuelve decorativo. Ahora usa `raizDelMonorepo()`, como las demás guardas que leen ficheros de la raíz. Y se
vio fallar **por el motivo correcto** después: con la reserva devuelta a `:-0`, `1 failed, 9 passed`.

**3. Un caso mío pasaba por el motivo equivocado.** AC-01 del reenvío usaba `emailVerified`, campo que no
existe — el esquema tiene `emailVerifiedAt` (`schema.prisma:75`). El servicio no veía la verificación, así que
no reenviaba **por ceguera, no por respeto**: un caso verde que no comprobaba nada. Corregido antes de darlo
por bueno.

**4. La evidencia de H-030 no puede ser la respuesta del endpoint.** La respuesta ya decía «Verification email
sent» cuando la llamada estaba comentada. Se comprobó contra **Mailhog**: `1 → 2` correos. Es la diferencia lo
que se afirma.

---

## Dos guardas ajenas se pusieron en rojo, con razón

- **RULE-33** (`estado-de-hallazgos-coherente`) — `RESUMEN.md` y `ESTADO_ACTUAL.md` anunciaban `0` hallazgos
  activos mientras H-029 y H-030 estaban abiertos en el registro. `Expected: 2, Received: 0`.
- **RULE-20** (`coherencia-de-registros`) — la carpeta `evidence/PT-182/` existía antes que la entrada de
  PT-182 en `HISTORY.log`.

Las dos veces **el número lo corrigió el trabajo, no la guarda**: se cerraron los hallazgos y se escribió la
entrada. Es exactamente para lo que se escribieron esas guardas.

---

## Lo que este PT NO afirma

- **Que reCAPTCHA esté protegiendo el registro hoy.** No lo está: `RECAPTCHA_ENABLED=false`. Afirma que el día
  que se encienda protegerá, y que encendido a medias **rechaza** en vez de aparentar.
- **Que H-031 llegara a producción.** No llegó — nació y murió el mismo día.
- **Que no queden controles decorativos.** El barrido miró guards, `TODO` vivos y valores por defecto. Hay más
  sitios donde una afirmación puede no cumplirse.

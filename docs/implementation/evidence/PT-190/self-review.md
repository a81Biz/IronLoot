# PT-190 — Autorrevisión (FDGE STATE 5)

**Fecha**: 2026-07-29 · **Rama**: `docs/PT-190-cierre-y-push`

---

## Checklist

- [x] **RULE-38 escrita**, con el fallo real que la originó y las dos advertencias que costaron trabajo.
- [x] `CLAUDE.md`, Delta Log y README del contrato al día: **36 reglas · 15 suites de documentación · 159 pruebas**.
- [x] `PENDING_TASKS.md` y `HANDOFF.md` con los cinco `AUD` abiertos y su coste.
- [x] Índice de estado regenerado: **142 encabezados · 0 realmente abiertos**.
- [x] Suite completa verde antes de subir.

---

## Por qué este PT existe

**PT-189 escribió la guarda y no la regla.** Este repositorio funciona porque cada guarda tiene su `RULE-NN` que
explica por qué existe y qué fallo real la originó. Una guarda sin regla es un mecanismo sin memoria: quien la
encuentre fallando en seis meses no sabrá si arreglar el código o borrar la prueba.

## Lo que deliberadamente NO hice

**No abrí ninguno de los cinco `AUD` abiertos.** Pediste actualizar la documentación y preparar la subida, no
arreglar lo que quede. Empezar `AUD-006` —autenticar el handshake del WebSocket— o `AUD-011` —enrutar las
mutaciones del panel por la máquina de estados— habría sido ampliar el alcance por iniciativa propia sobre una
petición de cierre.

Y **no los promoví a `H-XXX`**: eso los metería en el score de Health de PTSA, y es una decisión tuya. Quedan
declarados con evidencia y coste estimado en `PENDING_TASKS.md`, que es donde se leen.

## Lo que este PT NO afirma

- **No afirma que no quede nada.** Quedan **5 hallazgos abiertos verificados** y **15 sin verificar**, y los
  cinco inventarios sin guarda siguen sin ella.
- **No afirma que RULE-38 impida el problema entero.** Impide que un documento presente como vivo algo corregido.
  **No comprueba si una afirmación es cierta** — para eso hay que medir, y medir es lo que sigue siendo trabajo
  humano o de una sesión como esta.

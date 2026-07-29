# HANDOFF — estado actual

**FDGE V3** · **2026-07-29** · Se **sobrescribe**: es el estado de ahora, no la historia.

**Rama**: `master`, árbol limpio, cero ramas sin fusionar. **Sin subir a `origin`.**

**Pruebas**: **1078** unitarias en verde — API **825** (107 suites) · CORE **134** · CLIENT **103** ·
ADMIN **13** · BASE **3**.

**Reglas duras**: **30** `RULE-NN`.

---

## Pendiente: una cosa

**H-005 — la facturación fiscal.** Falta **contratar un PAC** ante el SAT y **decidir quién emite la
factura**. Sin proveedor no hay nada que implementar, y se mantiene abierta hasta tenerlo.

Es el **único hallazgo activo del sistema**. Mantiene D1 en 85 y `P-012` en `IDENTIFICADO`. Los tres
modelos, con sus consecuencias técnicas medidas, están en `evidence/PT-155/hallazgos.md`.

**Nada más está pendiente.** Todo lo demás se cerró con VoBo humano el 2026-07-29.

---

## Lo que cerró hoy

| | |
|---|---|
| **Tanda FPGE-003** | PT-148…PT-162, quince |
| **Cierre** | PT-163 (reputación pública) · PT-164 (imagen recortada) · PT-165 (patrones de guardas) |
| **Hallazgos** | H-021, H-022, H-023, H-024 → `CERRADA` |
| **Deuda** | TD-016 cerrada con triaje real |

### Lo que más vale de la jornada

**Un instrumento que afirmaba sin medir.** `audit:domain` imprimía `cross_coherence_verified = true`
con las cinco comprobaciones en error, y salía con código 0. Dentro de la herramienta que la auditoría
usa para medir.

**Tres controles muertos en ADMIN.** Ninguna `data-accion` estaba registrada: el botón «Rechazar» de
moderación no abría nada. PT-096 movió el JS «tal cual» y «tal cual» perdió los `onclick`. PT-139
corrigió dos casos sin escribir el mecanismo; por eso quedaban tres.

**Una decisión revisada con dato nuevo.** PT-161 midió tamaño (3.1 %) y decidió no recortar la imagen
— correcto con lo que se sabía. PT-150 midió **seguridad**: catorce de treinta vulnerabilidades las
causaban dependencias de desarrollo en producción. PT-164 recortó: **548 → 450 MB** y **14 → 2**.
El bulto estaba en `packages/core`, que se copiaba entera y **no necesita `node_modules` en
ejecución**.

> Medí la variable equivocada. «Es más grande de lo necesario» lleva a contar MB; la pregunta útil era
> *qué mete en producción código que no se ejecuta*.

### Y una corrección de proceso

Señalaste que los pendientes **aumentaban**. Tenías razón: `PENDING_TASKS.md` había acumulado seis
entradas que no eran trabajo sino observaciones. Tres se cerraron haciéndolas; tres se movieron a
donde pertenecen.

**Una observación no es un pendiente.** Si no tiene dueño, alcance y un final reconocible, va a su
nota y no a la lista de trabajo.

---

## Estado de la auditoría

```
S-003 (delta sync)   Health 88.9  ·  Risk 100  ·  Confidence 87.0  ·  Clase B
```

Los cuatro hallazgos que la bajaron están **cerrados**, así que el próximo `resume PTSA` debería
subirla. Sigue pendiente de medir **D1 al 100 % y D5**, que exigen una base **con historia** — es
trabajo PTSA y vive en `PTSA/PENDIENTES.md`.

## Siguiente

1. **`git push origin master`**.
2. **`resume PTSA`** cuando quieras — con los cuatro hallazgos cerrados, los scores suben.
3. **H-005**: cuando haya proveedor.

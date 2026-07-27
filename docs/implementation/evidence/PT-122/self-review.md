# PT-122 — Self-Review

**Fecha**: 2026-07-27 · **Rama**: `feature/PT-122-fiabilidad-operacional` ·
**Estado**: VALIDATION_PENDING

## Checklist FDGE STATE 5

- [x] **¿Criterios verificados?** Los cinco del enriquecimiento.
- [x] **¿Escenarios pasando?** FO-01…FO-10 (10/10), con los bordes exactos de los umbrales.
- [x] **¿Efectos colaterales?** Sólo lee.
- [x] **¿Commit atómico?** Uno.
- [x] **¿Documentación actualizada?** `audit-scope.yaml` reclasifica D5.

## La corrección de alcance, que es la mitad de este PT

`audit-scope.yaml` listaba D5 entre los `ci_checkpoints`. **Es una clasificación equivocada, no una
implementación pendiente.**

`Success Rate` y `Retry Rate` se calculan sobre historia de ejecución, y en CI la base nace vacía en
cada corrida. Un checkpoint de D5 en el pipeline devolvería `SIN_DATOS` siempre — y con el tiempo
alguien lo leería como verde. Fabricar ese checkpoint habría sido peor que no tenerlo.

D5 es métrica de **delta sync**, y así queda escrito.

## Un error mío, cazado antes de commitear

La primera versión daba:

```
Retry Rate   75%   ROJO
health_unstable = true → clase tope B
```

Y era **falso**. El denominador incluía los ciclos abiertos: 3 de los 4 estaban en `REQUESTED` —
nunca se pagaron— y la vía garantizada los estaba sondeando. Un ciclo que aún no ha terminado no
«necesitó un reintento»: está esperando a que alguien pague.

Con el denominador correcto —ciclos **resueltos**— la tasa es **0%, verde**.

Sin esa corrección, una métrica mal definida habría capado la clasificación del sistema a B. Un
número de auditoría equivocado no es un número inocuo: **decide**.

Los ciclos abiertos en sondeo se informan aparte: son señal, pero no de reintento.

## El matiz que el informe explica en voz alta

Un `POLL_ATTEMPT` **no es un fallo**: es la vía garantizada haciendo lo que PT-087 diseñó. Un
`Retry Rate` alto aquí significa «las pasarelas no notifican», no «el sistema falla».

Medirlo sigue valiendo —si sube, algo cambió fuera— pero leerlo como calidad del código sería un
error, y por eso el informe lo dice antes que los números.

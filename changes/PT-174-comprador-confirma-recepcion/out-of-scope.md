# PT-174 — Fuera de alcance

1. **`RETURNED` y devoluciones.** El enum lo tiene y nada lo usa. Abrirlo arrastra reembolsos y logística.
2. **Resolución de disputas.** Resolver y reembolsar son dos pasos por decisión ya tomada; este PT no los
   une. Con la opción B, una disputa abierta impide que el timer libere, y nada más.
3. **Integración con transportistas.** Transportista y guía son texto; no se consulta ninguna API de
   tracking.
4. **Correo.** El aviso in-app entra; el correo no.
5. **La opción C** (reclamar contra saldo futuro o una reserva de plataforma). Exige un modelo de saldo que
   no existe.
6. **El subsistema de retiro.** Ya implementado y probado real (PT-069 a PT-072). Este PT sólo hace que el
   dinero **llegue** a ser retirable por el camino verdadero.
7. **`docs-v2/`.** La mantienen personas (ADR-049). Se anota qué necesitarían saber, no se edita.
8. **Los hallazgos de auditoría H-025, H-026 y H-027.** Van por su cuenta, en su propio ciclo.

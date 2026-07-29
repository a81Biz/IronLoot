# `archive/` — Los nueve documentos que `docs-v2/` sustituye

**No leas esto para entender IronLoot.** Léelo sólo para reconstruir qué se creía el 23-jun-2026, o
para seguir una cita histórica de `PTSA/`, `changes/` o `HISTORY.log` que apunte aquí.

La documentación viva del producto es **[`docs-v2/`](../../../docs-v2/)**. El mapa documento a
documento —qué decía cada uno de éstos y dónde está ahora— está en
[`../README.md`](../README.md).

## Por qué no se borraron

Tres razones, en orden de peso:

1. **`03-TRD.md` sigue vigilado.** `coherencia-documentacion-codigo.spec.ts` (PT-130) comprueba sus
   nueve citas `fichero:línea`. Archivar no lo hace menos verificable; borrarlo sí desactivaría la
   guarda, y ése es exactamente el mecanismo de H-016.
2. **`PTSA/` cita estos ficheros en evidencias cerradas.** `E-007`, `E-008`, `E-009`, `E-012`,
   `E-020` y varias fases apuntan aquí. La inmutabilidad auditable (`[A6]`) no permite que una
   evidencia se quede sin su fuente.
3. **Un archivo sin mapa es un cementerio, y un borrado sin archivo es una laguna.** Si mañana
   aparece que `docs-v2` no cubría algo, esto es lo que se consulta para saberlo.

## Lo que NO hay que hacer con esto

- **No actualizarlos.** Si algo de aquí está mal, se corrige en `docs-v2/`. Mantener los dos árboles
  es precisamente lo que ADR-049 cerró.
- **No citarlos desde código nuevo.** La única cita viva es la del TRD, y está declarada.

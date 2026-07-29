# PT-154 / PT-157 — Evidencia

## H-024, medido antes

```
$ for f in $(rutas de `docs:` en audit-scope.yaml); do test -e $f || echo ROTA $f; done
ROTA docs/enterprise-documentation/02-PRD.md
ROTA docs/enterprise-documentation/03-TRD.md
ROTA docs/enterprise-documentation/09-Security-Architecture.md
ROTA docs/enterprise-documentation/06-Backend-Architecture.md
```

Cuatro de cinco. **Las archivó PT-141 el día anterior** bajo ADR-049; ese PT siguió las citas de
`CLAUDE.md` y la guarda del TRD y no siguió ésta.

Y `# 23 migraciones — ninguna se ha ejecutado nunca (H-014)`: son **2** —PT-127 las refundió— y **las
dos están aplicadas**, verificado en `_prisma_migrations` (E-027).

## Lo que la guarda destapó y la corrección sola no habría visto

Corregí el bloque `docs:` y **la guarda siguió en rojo**:

```
+   "docs/enterprise-documentation/02-PRD.md",
+   "docs/enterprise-documentation/03-TRD.md",
+   "docs/enterprise-documentation/09-Security-Architecture.md",
```

Había una **segunda lista**, en `auditable_patterns`, con las mismas tres rutas. Corregir sólo la
primera habría dejado el fichero mintiendo igual — en otro sitio, y con todo en verde.

**Ésta es la justificación entera de que el PT lleve mecanismo y no sólo una corrección.** Es la
tercera vez que el patrón aparece (H-016, PT-130, esto), y la primera en que algo lo caza.

## Después

```
✓ C1: toda ruta citada por `audit-scope.yaml` existe
✓ C2: el comentario de migraciones dice el numero real
✓ C1: ninguno de los nueve archivados reaparece en la raiz     (PT-154)
✓ C2: y siguen estando en `archive/` — archivar no es borrar   (PT-154)
✓ C3: el contrato de agente sigue en la raiz                   (PT-154)
✓ AC-01 · AC-02 · AC-03
```

Las seis rutas del alcance existen, comprobadas una a una.

## PT-154 — las dos direcciones

La guarda de ADR-049 comprueba **tres** cosas, no una:

1. Los nueve **no reaparecen** en la raíz. Es el escenario que preocupaba: `[START FOUNDATION]` los
   reemite, aparecen nueve ficheros, y **nada falla**.
2. Los nueve **siguen en `archive/`**. Sin esto, borrarlos satisfaría el punto 1 destruyendo lo que
   `[A6]` protege — PTSA los cita en evidencias cerradas, y `03-TRD.md` sigue verificado allí.
3. El contrato de agente **sigue en la raíz**. La decisión también se desharía por ese lado.

## Suite

`805` en 104 suites (796 → 805: **+9** de la guarda nueva).

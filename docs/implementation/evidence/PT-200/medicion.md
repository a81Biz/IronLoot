# PT-200 — lo medido

## Las trece afirmaciones, contra su fuente

| Documento | Decía | Medido el 2026-07-30 | Cómo |
|---|---|---|---|
| `HANDOFF.md:7` | API 138 suites | **137** | `npx jest --listTests \| wc -l` |
| `HANDOFF.md:10` | guardas doc 15 suites / 159 pruebas | **18 / 184** *(19 con la nueva)* | corrida de `--testPathPattern=documentacion` |
| `HANDOFF.md:13` | 150 encabezados | **151** | `npm run indice:estado` |
| `HANDOFF.md:29` | tabla S-009 / S-010 | el texto describe **S-011** | lectura |
| `HANDOFF.md:36` | 35 hallazgos registrados | **36** | `ls PTSA/Hallazgos/H-*.md` |
| `HANDOFF.md:145,172` | veredictos 20·0·1·15 | **35 · 0 · 1 · 0** | tabla de veredictos |
| `HANDOFF.md:170` | 3 inventarios «no enumerables» | **los tres con guarda** | PT-198 |
| `HANDOFF.md:397` | 2 abiertas de 24 | **2 de 19** | `### TD-` + línea `**Status:**` |
| `docs-v2/README.md:3` | 1078 unitarias (API 825/107, CORE 134, CLIENT 103) | **1366** (1113/137 · 93 · 144) | corridas |
| `Master-Test-Plan.md:24` | core 8 / 134 | **6 / 93** | corrida de CORE |
| `Master-Test-Plan.md:25` | api 121 / 985 | **137 / 1113** | corrida del API |
| `Master-Test-Plan.md:78` | Comisiones **0 tests** | **11** en 2 suites | `--testPathPattern=commissions` |
| `Master-Test-Plan.md:79` | Reembolsos **0 tests** | **5** | `--testPathPattern=refunds` |

## El hueco de numeración de la deuda

```
### TD-  en 10-Technical-Debt.md:  TD-001..TD-017, TD-024, TD-025   -> 19 entradas
git log -S "TD-018" / -S "TD-020":  sin resultados                 -> nunca existieron
abiertas (línea **Status:** sin CERRADA/CLOSED/MITIGADA):          -> TD-002, TD-009
```

Se declara en vez de renumerarse: `TD-024` está citada por ADR-058, por `HISTORY.log` y por dos guardas.
Mismo criterio que `11-Conventions.md:584` con sus dos huecos de regla.

## El comando documentado que no se ejecutaba

```
host:        TSError TS5109 — 'moduleResolution' debe ser NodeNext cuando 'module' es NodeNext
contenedor:  EROFS — /repo montado de sólo lectura
```

**El dato era correcto**: `indice-de-estado-al-dia.spec.ts § C2` compara el índice publicado contra lo que
el generador produce, compilándolo en proceso, y estaba en verde. Roto estaba **el punto de entrada** que
`CLAUDE.md` documenta.

Causa: el `tsconfig.json` de la raíz se borró en `004f5dc` («frontend implementation»). Sin él ts-node no
encuentra opciones. Que la ausencia era el descuido y no la regla lo dice el propio `.gitignore`, que en
su línea 322 **des-ignora explícitamente** ese fichero. Restituido como `extends` de `tsconfig.base.json`
con `include: []`, para que no participe en ninguna compilación.

```
$ npm run indice:estado
[indice:estado] 152 encabezados · 1 realmente abiertos
   ABIERTO  PT-200  (linea 4167)  VALIDATION_PENDING
```

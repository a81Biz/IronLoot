# PT-102 — spec-changes.md

## Documentación que cambia

| Documento | Cambio |
|---|---|
| `docs/enterprise-documentation/11-Conventions.md` | **Regla nueva**: una plantilla que dependa de un script externo debe cargarlo **antes** y con `defer`, y esa dependencia la vigila una prueba. Es la regla que F-34 demostró que faltaba |
| `docs/enterprise-documentation/10-Technical-Debt.md` | Nota en TD-005/TD-010 (cerradas por PT-096): el refactor que las cerró introdujo F-34. Queda dicho dónde |
| `docs/implementation/VALIDACION-PT-090-101.md` | §2 (PT-098) y §11 (PT-096) dejan de estar bloqueadas cuando este PT se valide |
| `CLAUDE.md` | Decisión técnica nueva sobre orden de scripts y fallos observables |

## Contratos que NO cambian

- El namespace `/auctions` del API y sus eventos (`bid:new`, `auction:extended`, `auction:ended`).
- La CSP de CLIENT.
- La ruta relativa del socket (PT-098).
- El hash SRI de socket.io (PT-089).

## Regla propuesta para `11-Conventions.md`

> **RULE-14 — Una dependencia entre scripts se declara, no se hereda del orden del fichero.**
>
> Si `a.js` necesita algo que define `b.js`, la plantilla carga `b` antes que `a` y **ambos con
> `defer`**. Un `<script>` sin `defer` que dependa de otro está roto aunque hoy funcione: funciona
> por la posición, y la posición se mueve.
>
> **Y el fallo tiene que verse.** Un `try/catch` alrededor de una función del producto debe
> registrar algo. Un `catch` vacío convierte un bug en una ausencia, y una ausencia no la reporta
> nadie.
>
> *Incorrecto* — así estuvo la puja en vivo, apagada y sin rastro (F-34):
> ```html
> <script src="/js/pages/pages-auction-detail.js"></script>
> <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
> ```
> ```js
> try { const socket = io('/auctions'); … } catch (e) { /* opcional */ }
> ```
>
> *Correcto*:
> ```html
> <script src="https://cdn.socket.io/4.7.5/socket.io.min.js" defer integrity="…" crossorigin="anonymous"></script>
> <script src="/js/pages/pages-auction-detail.js" defer></script>
> ```
> ```js
> if (typeof io !== 'function') { console.error('Puja en vivo no disponible: …'); }
> ```
>
> Lo vigila `src/apps/client/test/orden-de-scripts.spec.ts`.

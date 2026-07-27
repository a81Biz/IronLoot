# PT-036 — Self-Review (STATE 5)

**Fecha**: 2026-07-23 · **Origen**: AUD-004

## Checklist FDGE

- [x] **¿Todos los criterios de aceptación (`PLAN_ACTUAL.md §8`) verificados?**
  1. Arranque prod falla con creds default/vacías → ✓ (tests A1–A4, A2).
  2. Login admin 429 tras límite → ✓ código aplicado; verificación e2e en CI (B1 escrito).
  3. Login válido sigue devolviendo JWT (+TOTP) → ✓ (tests C1, TOTP).
  4. Dev no afectado → ✓ (A6 + "defaults dev autentican").
  5. RN-52/RN-53 satisfechas para admin → ✓ (se actualiza docs-v2 en STATE 7).
- [x] **¿Todos los escenarios del Proposal Package pasan?** A (8), C (5) en verde; B (throttle) vía e2e en CI (harness).
- [x] **¿Sin efectos colaterales en componentes relacionados?** Regresión 166/166. Graphify confirmó radio mínimo; `AdminController` (grado 80) no tocado (verificado: sigue `@SkipThrottle`).
- [x] **¿Reglas de `11-Conventions` respetadas?** Naming `kebab-case.ts`, patrón de config existente reutilizado (`PLACEHOLDER_SECRETS`/`validateStartupConfig`), sin `Float`, sin secretos hardcodeados nuevos.
- [x] **¿Commits atómicos, con convención y trazables a PT?** Sí (test/fix/docs: PT-036). Nota: el primer mensaje salió con un `@` espurio por sintaxis de heredoc; **corregido con `--amend`** antes de continuar.
- [x] **¿Sin artefactos de depuración/console.log/código comentado?** Sí; se **eliminó** la función inline duplicada de `main.ts` (no quedó comentada). Script de consulta Graphify vive en el scratchpad de sesión (fuera del repo).
- [x] **¿Documentación actualizada si cambió API pública?** El contrato de `POST /admin/auth/login` ahora puede devolver **429**; documentado en `spec-changes.md`; `.env.example` actualizado; docs-v2 (RN-52/53, checklist DevOps) se actualiza en STATE 7.

## Alcance respetado
- **Fuera de alcance** (no tocado): reingeniería auth admin (bcrypt/tabla), throttle de `AdminController`, CSP/CSRF admin (AUD-007), roles granulares. Registrado en `out-of-scope.md` y en `FDGE_HALLAZGOS_TRACKER.md`.

## Veredicto
Implementación completa y verificada a nivel unit + typecheck + lint + regresión. Pendiente: validación humana (BUG → no auto-cierre) y ejecución del e2e de throttle en CI.

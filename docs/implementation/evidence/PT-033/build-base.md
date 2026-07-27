# PT-033 — Evidence: BASE Build

**Date:** 2026-06-23  
**Branch:** fix/PT-033-auth-email-links  
**Command:** `cd src/apps/base && npm run build`

---

## Build output

```
> @ironloot/base@0.1.0 build
> nest build
```

Exit code: 0 — no errors, no warnings.

## Change verified by build

`src/apps/base/src/main.ts` — added import and `useGlobalFilters` registration:

```typescript
import { NotFoundExceptionFilter } from './common/filters/not-found.filter';
// ...
app.useGlobalFilters(new NotFoundExceptionFilter());
```

`nest build` performs `tsc --noEmit` + webpack bundle. Clean exit confirms:
- No missing imports
- `NotFoundExceptionFilter` class interface is compatible with `useGlobalFilters`
- No circular dependency regressions

---
description: Work on local persistence, imports, SQLite/web fallback behavior, autosave, data integrity, and shared type contracts.
effort: high
paths:
  - "src/data/**/*.ts"
  - "src/import/**/*.ts"
  - "src/types.ts"
---

# Local Data Change

## Workflow

1. Read affected types in `src/types.ts` and callers before editing.
2. Check both native SQLite and web fallback paths in `src/data/database.ts`.
3. Preserve report autosave, status transitions, source keys, and import warnings.
4. Keep CSV/XLSX and Genesis bundle paths separate unless the task explicitly merges behavior.
5. Validate with `npm run typecheck`; run converter checks if shared Genesis fields changed.

## Additional resources

- Local persistence reference: [references/local-persistence.md](references/local-persistence.md)

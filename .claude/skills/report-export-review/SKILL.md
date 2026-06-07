---
description: Review or change report completion, PDF HTML generation, structured JSON export, sharing behavior, and exported status handling.
effort: high
paths:
  - "app/report/**/*.tsx"
  - "src/pdf/**/*.ts"
---

# Report Export Review

## Workflow

1. Inspect `app/report/[id].tsx`, `src/pdf/reportPdf.ts`, and relevant types.
2. Preserve required completion validation and autosave before export/share.
3. Keep PDF HTML printable, escaped, deterministic, and concise.
4. Preserve structured report schema unless explicitly migrating it.
5. Validate with `npm run typecheck` and manual output-logic review.

## Additional resources

- Report export contract: [references/report-export-contract.md](references/report-export-contract.md)

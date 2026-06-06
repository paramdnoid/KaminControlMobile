---
paths:
  - "src/data/**/*.ts"
  - "src/import/**/*.ts"
  - "src/types.ts"
---

# Local Data And Import Rules

- `src/types.ts` is the shared contract between mobile screens, database mapping, report export, and the converter.
- Native persistence uses `expo-sqlite`; web mode uses the fallback store in `src/data/database.ts`.
- Keep import parsing tolerant of Swiss/German field names and existing ASCII transliterations such as `Gebaeudeart`, `Eigentuemer`, and `Strasse`.
- Do not change bundle or report shapes without checking all consumers: import preview, database upsert/import, report screens, PDF/JSON export, and converter tests.
- Data-layer changes require `npm run typecheck`; converter-facing type or Genesis shape changes also require `npm run converter:test` and `npm run converter:build`.

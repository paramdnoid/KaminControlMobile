---
paths:
  - "app/report/**/*.tsx"
  - "src/pdf/**/*.ts"
---

# Report Export Rules

- Report output has two surfaces: local PDF HTML and structured JSON from `buildStructuredReport`.
- Keep PDF HTML deterministic and printable; escape user/customer text before inserting it into HTML.
- Do not mark a report exported unless the export/share step has succeeded or the user explicitly requests manual status correction.
- Preserve `schema: kamincontrolmobile.report.v1` unless the user asks for a report contract migration.
- Report changes require `npm run typecheck` and manual review of PDF/JSON output logic.

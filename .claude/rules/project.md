# Project Rules

- Treat the README V1 scope as authoritative: offline app, local persistence, converter-mediated Genesis import, local PDF/JSON report output.
- Keep implementation changes in the smallest relevant subsystem. Avoid mixing app behavior, converter mapping, PDF output, and config changes in one change unless the task requires it.
- Prefer TypeScript types from `src/types.ts` and existing utility functions from `src/utils/`.
- Do not introduce paid dependencies, cloud services, auth flows, server APIs, or direct Genesis sync unless the user explicitly changes the product scope.
- For generated artifacts, use `.gitignore` as the source of truth and avoid committing customer data or build output.

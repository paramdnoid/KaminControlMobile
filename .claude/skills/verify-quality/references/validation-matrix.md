# Validation Matrix

## Existing Commands

- `npm run typecheck`: app TypeScript plus converter TypeScript.
- `npm run converter:typecheck`: converter TypeScript only.
- `npm run converter:test`: Genesis converter mapping assertions.
- `npm run converter:build`: Vite build for the converter renderer.
- `npm run lint`: ESLint for `app/**/*.ts(x)` and `src/**/*.ts(x)`.
- `npm run lint:fix`: ESLint autofix for app and shared source files.
- `npm run claude:validate-settings`: full JSON Schema validation for `.claude/settings.json` and `.claude/settings.local.json` when present.
- `npm start`, `npm run android`, `npm run ios`, `npm run web`: development launch commands.

## By Change Surface

- `CLAUDE.md`, `.claude/**`, `.gitignore`: parse `.claude/settings.json`, run `npm run claude:validate-settings`, compile `.claude/hooks/*.py`, verify agent `skills:` links, run hook simulations, `git diff --check -- CLAUDE.md .claude .gitignore`.
- `app/**`, `src/components/**`, `src/theme/**`: `npm run typecheck`, then manual route smoke check.
- `src/data/**`, `src/import/**`, `src/types.ts`: `npm run typecheck`; add converter checks if Genesis bundle fields changed.
- `desktop-converter/**`: `npm run typecheck`, `npm run converter:test`, `npm run converter:build`.
- `src/pdf/**`, `app/report/**`: `npm run typecheck`, manual PDF/JSON output review.
- `README.md` or docs-only: `git diff --check`; run script checks only if docs claim behavior changed.

## Known Gaps

- No automated mobile E2E suite exists.
- No rendered PDF visual snapshot suite exists; `converter:test` includes PDF HTML pure-function regression assertions.
- Converter tests are assertion-based TypeScript scripts, not a full test runner.

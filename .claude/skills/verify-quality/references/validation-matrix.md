# Validation Matrix

## Existing Commands

- `npm run typecheck`: app TypeScript plus converter TypeScript.
- `npm run converter:typecheck`: converter TypeScript only.
- `npm run converter:test`: Genesis converter mapping assertions.
- `npm run converter:build`: Vite build for the converter renderer.
- `npm run lint`: ESLint for `app/**/*.ts(x)` and `src/**/*.ts(x)`.
- `npm run lint:fix`: ESLint autofix for app and shared source files.
- `npm run claude:validate-settings`: full JSON Schema validation for `.claude/settings.json` and `.claude/settings.local.json` when present, plus guard-hook simulations, Python hook compile, agent skill links, skill frontmatter policy, and validation-marker/Stop-gate simulation.
- `npm run claude:test-hooks`: guard-hook simulations only.
- `/ship-check`: manual final gate before commit, push, PR, or handoff.
- `/diff-review <scope or plan>`: manual fresh-context review of the current diff against requirements.
- `npm start`, `npm run android`, `npm run ios`, `npm run web`: development launch commands.

## By Change Surface

- `CLAUDE.md`, `.claude/**`, `.gitignore`: run `npm run claude:validate-settings`, then `git diff --check -- CLAUDE.md .claude .gitignore`.
- Bash-based file mutations: rely on `mark_validation_needed.py` to classify Git changes after mutating commands; `quality_gate_stop.py` also falls back to Git status if the marker is missing.
- App config files (`app.json`, `metro.config.js`, `babel.config.js`, `eslint.config.mjs`, `tailwind.config.js`, `nativewind-env.d.ts`, `tsconfig*.json`, `package*.json`): treat as app validation surfaces.
- `app/**`, `src/components/**`, `src/theme/**`: `npm run typecheck`, then manual route smoke check.
- `src/data/**`, `src/import/**`, `src/types.ts`: `npm run typecheck`; add converter checks if Genesis bundle fields changed.
- `desktop-converter/**`: `npm run typecheck`, `npm run converter:test`, `npm run converter:build`.
- `src/pdf/**`, `app/report/**`: `npm run typecheck`, manual PDF/JSON output review.
- `README.md` or docs-only: `git diff --check`; run script checks only if docs claim behavior changed.

## Known Gaps

- No automated mobile E2E suite exists.
- No rendered PDF visual snapshot suite exists; `converter:test` includes PDF HTML pure-function regression assertions.
- Converter tests are assertion-based TypeScript scripts, not a full test runner.

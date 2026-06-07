# KaminControlMobile Claude Router

## Project Reality

- Expo Router / React Native / TypeScript mobile app for local Kaminfeger rapports.
- V1 is offline-first with no login, no cloud backend, and no direct Genesis sync.
- Local persistence is `expo-sqlite` on native and web storage fallback in `src/data/database.ts`.
- Genesis data is imported through the desktop converter, then loaded into the mobile app as `genesis-export-v2.json` or `genesis-mobile-export.zip`.
- Reports produce local PDF output and structured JSON; customer files, PDFs, MDBs, ZIPs, and generated bundles are sensitive local artifacts.

## Commands

- Install: `npm install`
- Mobile dev: `npm start`, `npm run android`, `npm run ios`, `npm run web`
- Typecheck: `npm run typecheck`
- Converter typecheck: `npm run converter:typecheck`
- Converter test: `npm run converter:test`
- Converter build: `npm run converter:build`
- Converter UI: `npm run converter:start`
- Converter CLI: `npm run converter:convert -- <Daten.zip> <output.json>`
- Lint: `npm run lint`, `npm run lint:fix`
- Claude settings and hook simulations: `npm run claude:validate-settings` (shared/local settings schema, guard-hook regression tests, and validation-marker workflow)
- Manual final gate: `/ship-check`
- Manual fresh diff review: `/diff-review <scope or plan>`

## Routing

- Architecture, feature scope, cross-cutting changes: `kcm-senior-dev-lead`
- Expo Router screens, React Native state/components: `kcm-mobile-frontend-engineer`
- Premium mobile UI, usability, touch layout: `kcm-premium-mobile-designer`
- SQLite/web store/import persistence: `kcm-local-data-engineer`
- Genesis MDB/ZIP mapping and converter: `kcm-genesis-converter-specialist`
- PDF, report JSON, export/share status: `kcm-report-export-specialist`
- Customer data, generated artifacts, dangerous commands: `kcm-security-privacy-reviewer`
- Validation strategy and regression checks: `kcm-qa-reviewer`
- README, memory, context, planning docs: `kcm-docs-memory-specialist`

Use the main thread as orchestrator. Specialists do not call other agents. When work crosses specialties, they return `PENDING HANDOFF` with the target agent and reason.

## Working Rules

- Start from repo evidence: inspect `package.json`, `README.md`, affected source, and existing scripts before changing guidance or code.
- Prefer `rg`/`rg --files` for repo search and keep shared Bash permissions narrow; add local-only convenience rules in `.claude/settings.local.json` only when they are concrete and safe.
- Do not broad-preapprove tools in skills. Review, planning, security, and verification skills stay read-only with `disallowed-tools: Edit MultiEdit Write`.
- Keep V1 scope honest. Do not add backend, auth, cloud sync, or direct Genesis sync assumptions unless the user requests a new scope.
- Preserve customer-data safety. Do not read, summarize, or mutate generated PDFs, MDBs, ZIPs, exported bundles, or `artifacts/` unless the user explicitly asks for that artifact work.
- Prefer existing patterns: Expo Router in `app/`, shared UI in `src/components/`, types in `src/types.ts`, local data in `src/data/`, converter code in `desktop-converter/`.
- Keep comments and docs concise. Put long workflows into skills and long reference material next to the skill that consumes it.

## Validation

- Config-only changes: parse shared/local JSON, run `npm run claude:validate-settings`, compile Python hooks, check agent skill links, and `git diff --check -- CLAUDE.md .claude .gitignore`.
- Bash-based file changes must still be validated: `mark_validation_needed.py` classifies Git changes after mutating Bash commands, and `quality_gate_stop.py` falls back to Git status when no marker exists.
- Run `/ship-check` before commit, push, PR, or handoff.
- App or shared TypeScript changes: `npm run typecheck` and `npm run lint`.
- Converter changes: `npm run typecheck`, `npm run converter:test`, and `npm run converter:build`.
- PDF/report flow changes: include `npm run typecheck` + `npm run lint` and manually inspect generated HTML/JSON logic.
- UI changes: run `npm run typecheck` + `npm run lint` and manually smoke the relevant Expo screen; no mobile E2E suite exists yet.

## Context And Effort

- Use high effort for architecture, Genesis mapping, local persistence, export correctness, and safety reviews.
- Use medium effort for narrow UI polish, docs, and small config edits after the relevant files are known.
- Use skills for repeatable workflows and references. Do not paste long design, schema, or validation references into the main context unless the task needs them.
- Use auto memory for durable learnings from debugging and repeated corrections; keep project instructions in this file or `.claude/rules/`.

---
description: Run the final KaminControlMobile quality gate before commit, push, or handoff. Use only when explicitly invoked.
effort: high
disable-model-invocation: true
disallowed-tools: Edit MultiEdit Write
---

# Ship Check

## Workflow

1. Inspect `git status --short` and `git diff --name-only`.
2. Select gates from [../verify-quality/references/validation-matrix.md](../verify-quality/references/validation-matrix.md).
3. Always include `npm run claude:validate-settings` and `git diff --check -- CLAUDE.md .claude .gitignore` when `.claude/**` or `CLAUDE.md` changed.
4. Run app and converter gates when their surfaces changed: `npm run typecheck`, `npm run lint`, `npm run converter:test`, `npm run converter:build`.
5. Report exact commands, pass/fail status, changed files, and remaining manual coverage gaps.

## Rules

- Do not edit files.
- Do not stage, commit, push, or merge.
- If a gate fails, stop at the failure and report the smallest next repair.

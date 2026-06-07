---
description: Verify KaminControlMobile changes. Use after edits or before commits to run the correct typecheck, converter tests/build, Claude config checks, hook simulations, and known manual checks.
effort: medium
disallowed-tools: Edit MultiEdit Write
---

# Verify Quality

## Workflow

1. Inspect changed files with `git status --short` and `git diff --name-only`.
2. Select checks from [references/validation-matrix.md](references/validation-matrix.md).
3. For Claude config, run `npm run claude:validate-settings` and `git diff --check -- CLAUDE.md .claude .gitignore`.
4. For app or converter changes, run the exact `package.json` scripts.
5. Report pass/fail, exact commands, and remaining coverage gaps.

## Required honesty

- Do not claim mobile E2E or rendered PDF visual regression coverage exists unless scripts have been added.
- If a check cannot run, state the reason and residual risk.

## Additional resources

- Validation matrix: [references/validation-matrix.md](references/validation-matrix.md)

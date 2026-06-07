---
description: Review the current diff against a stated plan or scope. Report only correctness, security, validation, or scope gaps.
effort: high
disable-model-invocation: true
context: fork
disallowed-tools: Edit MultiEdit Write
---

# Diff Review

## Workflow

1. Read `git status --short`, `git diff --name-only`, and the relevant diff.
2. Compare the diff against the user-provided plan or the current task scope in `$ARGUMENTS`.
3. Check for behavior gaps, security regressions, missing validation, accidental broad permissions, and unrelated file changes.
4. Report findings first, ordered by severity, with file and line references where possible.

## Rules

- Do not edit files.
- Do not report style preferences unless they affect correctness, safety, or the stated requirements.
- If no issues are found, say so and list any residual test gaps.

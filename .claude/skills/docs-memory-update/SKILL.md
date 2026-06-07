---
description: Update README, Claude config docs, project memory guidance, context hygiene, effort policy, and workflow documentation.
effort: medium
paths:
  - "README.md"
  - "CLAUDE.md"
  - ".claude/**/*.md"
  - ".claude/**/*.json"
  - "docs/**/*.md"
---

# Docs Memory Update

## Workflow

1. Verify current repo facts before editing docs.
2. Keep always-on docs short; move procedures into skills and detailed references into skill-local `references/`.
3. Ensure every claimed command exists in `package.json`.
4. Keep memory guidance free of customer data and secrets.
5. Validate docs/config edits with JSON parse, hook compile if relevant, skill-link checks, and `git diff --check`.

## Additional resources

- Context and effort policy: [references/context-effort-policy.md](references/context-effort-policy.md)

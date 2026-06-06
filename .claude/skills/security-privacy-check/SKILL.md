---
description: Review sensitive local data, generated artifacts, unsafe commands, Claude permissions, hook behavior, and privacy risks in KaminControlMobile.
effort: high
allowed-tools: Read Grep Glob LS Bash
---

# Security Privacy Check

## Workflow

1. Identify whether the task touches customer data, Genesis artifacts, PDFs, env files, signing keys, or destructive commands.
2. Inspect `.gitignore`, `.claude/settings.json`, hooks, import/export paths, and affected code.
3. Separate verified risks from policy improvements.
4. Recommend enforceable controls when a rule must always hold.
5. Do not read sensitive artifacts unless the user explicitly requests that exact artifact task.

## Additional resources

- Security and privacy reference: [references/security-privacy.md](references/security-privacy.md)

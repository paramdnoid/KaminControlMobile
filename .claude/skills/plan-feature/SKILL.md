---
description: Plan a KaminControlMobile feature or change. Use when work needs scope, architecture, handoffs, data/report/converter impact, or a decision-complete implementation path.
effort: high
allowed-tools: Read Grep Glob LS Bash
---

# Plan Feature

## Workflow

1. Inspect the real repo before proposing a plan: `README.md`, `package.json`, affected routes/components/data/converter/export files.
2. State the V1 scope fit: offline mobile app, local persistence, converter-mediated Genesis import, PDF/JSON export.
3. Identify affected surfaces: UI, local data, import parsing, Genesis converter, report export, docs/config.
4. Define the implementation path, contracts to preserve or change, edge cases, and validation gates.
5. Name required handoffs using `PENDING HANDOFF: <agent> - <reason>` when the task crosses a specialist boundary.

## Additional resources

- Domain and planning checklist: [references/feature-planning.md](references/feature-planning.md)

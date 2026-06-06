---
paths:
  - "README.md"
  - "CLAUDE.md"
  - ".claude/**/*.md"
  - ".claude/**/*.json"
  - "docs/**/*.md"
---

# Documentation, Memory, And Context Rules

- Keep root `CLAUDE.md` compact and always-on. Move long checklists or domain references into skills or `.claude/rules/`.
- Store durable project facts in project docs; use auto memory for learnings from repeated corrections or debugging.
- Do not add workflow claims that the repo cannot actually run. Anchor validation guidance to `package.json`.
- When editing Claude config, validate settings JSON, hook scripts, agent skill links, and whitespace with `git diff --check`.
- Prefer specific routing and handoff instructions over generic "use best practices" prose.

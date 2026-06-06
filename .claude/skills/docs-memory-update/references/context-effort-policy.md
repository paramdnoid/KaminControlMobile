# Context And Effort Policy

## Context Budget

- Root `CLAUDE.md` should stay compact and loaded every session.
- Use `.claude/rules/` for path-scoped rules that apply only when relevant files are opened.
- Use skills for repeatable workflows and references that should load on demand.
- Keep skill descriptions direct so Claude can select the right skill without loading long bodies.
- Store long domain references next to the consuming skill.

## Effort Defaults

- High effort: architecture, Genesis mapping, local persistence, report export correctness, security/privacy review.
- Medium effort: focused UI polish, docs, config cleanup, narrow bug fixes after the affected files are known.
- Low effort: tiny command lookups or status summaries.

## Memory Usage

- Project docs hold standards and workflow facts.
- Auto memory should capture durable debugging learnings, repeated corrections, and validated local run behavior.
- Never store secrets, customer records, report content, PDFs, MDB data, or generated bundles in memory.
- When instructions conflict, prefer the most specific project rule or user request.

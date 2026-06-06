---
paths:
  - "desktop-converter/**/*"
---

# Genesis Converter Rules

- The desktop converter is the only place that reads Genesis MDB/ZIP input. The mobile app imports prepared JSON/ZIP bundles only.
- Preserve audit warnings and table counts when changing mapping behavior.
- Keep the mobile bundle free of raw MDB rows unless a task explicitly asks for audit/export internals.
- Mapping changes must update or extend `desktop-converter/tests/genesisConverter.test.ts`.
- Converter changes require `npm run typecheck`, `npm run converter:test`, and `npm run converter:build`.

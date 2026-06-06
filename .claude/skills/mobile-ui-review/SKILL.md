---
description: Review or improve KaminControlMobile mobile UI, UX, responsive layout, accessibility, component placement, and premium visual quality.
effort: high
allowed-tools: Read Grep Glob LS Bash Edit MultiEdit Write
paths:
  - "app/**/*.tsx"
  - "src/components/**/*.tsx"
  - "src/theme/**/*.ts"
---

# Mobile UI Review

## Workflow

1. Inspect the affected route/component and existing theme tokens.
2. Identify the user task and field-work context.
3. Check hierarchy, density, touch targets, loading/empty/error/saving states, accessibility labels, and narrow-screen fit.
4. Implement with existing components/tokens first.
5. Validate with `npm run typecheck` and a manual smoke path recommendation.

## Additional resources

- Design system and UX reference: [references/design-system.md](references/design-system.md)

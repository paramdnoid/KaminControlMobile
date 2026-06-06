---
paths:
  - "app/**/*.tsx"
  - "src/components/**/*.tsx"
  - "src/theme/**/*.ts"
---

# Expo And Mobile UI Rules

- Use Expo Router routes under `app/` and shared UI components under `src/components/`.
- Keep screen state explicit and local unless shared persistence or navigation state is required.
- Use `Screen`, `Card`, `Button`, `SectionHeader`, `Field`, and theme tokens before adding new primitives.
- Mobile layouts must prioritize scanability, touch targets, clear hierarchy, and stable spacing over decorative composition.
- Preserve accessibility labels for inputs and use icon buttons only when the action remains clear.
- UI changes require `npm run typecheck` and a manual smoke check of the affected route.

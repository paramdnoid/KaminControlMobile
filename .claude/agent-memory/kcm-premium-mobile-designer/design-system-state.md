---
name: design-system-state
description: Current token values in src/theme/theme.ts after the 2026-06 premium refactor
metadata:
  type: project
---

As of 2026-06 premium refactor, `src/theme/theme.ts` exports:

**Colors (key additions/changes)**
- `background: '#F2EFE8'` (warm cream)
- `surface: '#FFFFFF'`
- `ink: '#1A1613'`
- `border: '#E3DCD0'`
- `divider: '#EDE7DD'` (lighter than border, for internal row separators)
- `muted: '#6B635A'`
- `mutedLight: '#A89E93'` (for chevrons, secondary meta, label caps)
- `primary: '#16453D'`
- `primarySoft: '#DBEAE4'`
- `accent: '#BC6230'`
- `success: '#2D6A4F'`, `danger: '#9F2D2D'`, `info: '#275C7D'`

**Shadow (new export)**
```ts
export const shadow = {
  card: { shadowColor: '#3A2E1F', shadowOffset: {0,4}, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  elevated: { shadowColor: '#2A2113', shadowOffset: {0,10}, shadowOpacity: 0.14, shadowRadius: 24, elevation: 8 },
  brand: { shadowColor: '#0F312B', shadowOffset: {0,6}, shadowOpacity: 0.28, shadowRadius: 14, elevation: 6 },
};
```
Spread into StyleSheet entries. Used by Card/PropertyCard/ReportCard/SegmentedTabs (card), Screen footer (elevated), and primary/danger Button lift (brand).

**Layout and type**
- `src/theme/theme.ts` currently exports `colors` and `shadow` only.
- Radius, spacing, and typography are handled through NativeWind/Tailwind classes and component-local styles.

**Why:** The token surface is intentionally small for the Expo/NativeWind app. Do not invent missing exports like `radius` or `typography`; either use the existing Tailwind/component pattern or add a token only when repeated usage justifies it.

**How to apply:** Always use `colors.mutedLight` for non-interactive chevrons, count badges, and label caps. Use `colors.divider` for hairline separators inside cards or section header top borders.

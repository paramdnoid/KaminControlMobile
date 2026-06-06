---
name: design-system-state
description: Current token values in src/theme/theme.ts after the 2026-06 premium refactor
metadata:
  type: project
---

As of 2026-06 premium refactor, `src/theme/theme.ts` exports:

**Colors (key additions/changes)**
- `background: '#F5F2EC'` (warm cream)
- `surface: '#FFFFFF'`
- `surfaceRaised: '#FDFCFA'` (new)
- `divider: '#EAE4DB'` (new — lighter than border, for internal row separators)
- `mutedLight: '#A39990'` (new — for chevrons, secondary meta, label caps)
- `primary: '#1E4E46'` (deepened from #24524A)
- `text: '#1C1917'` (deepened from #221F1B)

**Shadow (new export)**
```ts
export const shadow = {
  card: { shadowColor, shadowOffset: {0,1}, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  elevated: { shadowColor, shadowOffset: {0,3}, shadowOpacity: 0.11, shadowRadius: 10, elevation: 5 },
};
```
Spread into StyleSheet entries. Used by Card (card), Screen footer (elevated).

**Radius (updated)**
- `sm: 6` (unchanged)
- `md: 10` (was 8 → more rounded)
- `lg: 14` (was 12)
- `full: 999` (new token, was literal)

**Typography (additions)**
- `display: 32` (new — used for stat values on home screen)

**Why:** radius.md bumped for premium rounded feel consistent with modern professional tools. All components using radius.md via token automatically updated. Hardcoded `8`s in report/[id].tsx, property/[id].tsx, import.tsx updated to use radius tokens.

**How to apply:** Always use `colors.mutedLight` for non-interactive chevrons, count badges, and label caps. Use `colors.divider` for hairline separators inside cards or section header top borders.

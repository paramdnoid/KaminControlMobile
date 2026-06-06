---
name: project_tariff_suggestions_decision
description: TASK-04 decision — removed dead tariffSuggestions field and 'tariff' source literal from the codebase (Option A chosen)
metadata:
  type: project
---

Chose **Option A** (remove the field entirely) for TASK-04/TASK-11.

`GenesisPropertyContext.tariffSuggestions` was removed from `src/types.ts` because it was a dead duplicate of `objectTariffSuggestions` — both filtered for `item.source === 'objectTariff'`, no UI screen or export path consumed `tariffSuggestions` distinctly.

`'tariff'` was also removed from the `GenesisSuggestionSource` union. The `normalizeSuggestionSource` function previously mapped `'tariff' → 'objectTariff'`; that branch was deleted since no record in the DB can have `source === 'tariff'` once normalization runs.

**Why:** Dead code carrying a misleading name creates a future maintenance trap. Keeping a field named `tariffSuggestions` that contained exactly the same data as `objectTariffSuggestions` would eventually mislead a developer into thinking it had distinct semantics.

**How to apply:** If a future task asks about adding a `tariffSuggestions`-like field back, confirm what distinct semantic it should have and ensure the converter emits a distinct `source` literal before re-introducing it.

Related: [[project_quality_audit_2026_06]]

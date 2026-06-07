---
name: project-converter-state
description: Current state of the Genesis desktop converter — key files, version, known gaps, and contract shape as of the June 2026 review.
metadata:
  type: project
---

Converter is at version 2.0.0 (CONVERTER_VERSION constant, genesisConverter.ts:85). It emits schemaVersion 'genesis-bundle.v2'. The mobile isBundle() guard accepts both v1 and v2.

Core databases: KFDSTAMM.MDB, ARBVOL.MDB, Anschriften.MDB, FKSTAMM.MDB (core); KFKRECH.MDB, OPSTAMM.MDB (audit).

Key gaps found in June 2026 read-only review:
- `buildingTypeFrom` matches 'wohn' + 'geschäft' (umlaut) but MDB rows typically arrive as 'geschaeft' (ASCII) — misses 'Wohn-/Geschaeftshaus' unless the MDB encoding happens to preserve the umlaut.
- `parseAmount` strips only single-quote thousand separators (`'`) and comma decimals; does not handle period thousand separators or other locale variants.
- `CONVERTER_VERSION` and `schemaVersion` are hard-coded strings — no sync mechanism with package.json.
- IPC 'convert-genesis-zip' handler (main.ts:94-99) calls `toMobileGenesisBundle` and returns it, but the renderer's `saveExportFolder`/`saveTransportZip` then calls `toMobileGenesisBundle` a second time on the already-stripped bundle — double-strip is harmless but redundant.
- UI warning list is truncated to 16 items (main.tsx:172) — the full count is shown but warnings beyond 16 are invisible to the user.
- `GenesisSuggestionSource` type includes 'history' but no converter path ever sets `source: 'history'` on a plannedWork item — it is declared but unused.
- `notes` on `GenesisBundleProperty` is `optional (notes?)` in src/types.ts:281 but the database layer coalesces it with `compact(item.notes ?? '')` — safe but creates a quiet divergence.
- Test file contains PDF HTML regression tests (escapeHtml, computeTotalMinutes, buildStructuredReport) that are out of scope for the converter and belong in a report-export test.

**Why:** captured to avoid re-reading all files from scratch in future sessions.
**How to apply:** use as a starting point for mapping changes or test additions without re-reading all files.

---
description: Work on the Genesis desktop converter, MDB/ZIP mapping, mobile bundle shape, converter audit output, and converter tests/build.
effort: high
paths:
  - "desktop-converter/**/*"
  - "src/types.ts"
---

# Genesis Converter Workflow

## Workflow

1. Inspect `desktop-converter/src/genesisConverter.ts`, `src/types.ts`, and relevant converter tests.
2. Preserve the split: converter reads MDB/ZIP input; mobile app imports prepared JSON/ZIP bundles.
3. Keep source-key construction, warnings, table counts, and audit behavior deterministic.
4. Add or update assertions in `desktop-converter/tests/genesisConverter.test.ts` for mapping changes.
5. Validate with `npm run typecheck`, `npm run converter:test`, and `npm run converter:build`.

## Additional resources

- Genesis bundle contract: [references/genesis-bundle-contract.md](references/genesis-bundle-contract.md)

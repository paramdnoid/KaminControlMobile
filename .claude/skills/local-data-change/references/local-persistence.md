# Local Persistence Reference

## Storage Surfaces

- Native: `expo-sqlite`, database name `kamincontrol_v1.db`.
- Web: fallback store in `src/data/database.ts`, keyed by `kamincontrolmobile.v1.store`.
- The same public functions should behave consistently across native and web where feasible.

## Data Integrity Rules

- Preserve foreign-key intent between properties, reports, and work items.
- Keep work item order deterministic through `sortOrder`.
- Treat `completed` and `exported` statuses as meaningful workflow states.
- Avoid lossy updates when importing Genesis bundles; preserve warnings and import metadata.
- Keep source metadata (`sourceSystem`, `sourceKey`, `lastImportedAt`, `isActive`) coherent.

## Import Rules

- CSV/XLSX parsing accepts multiple Swiss/German header aliases.
- Genesis bundle import is prepared by the desktop converter; mobile code should not read MDBs.
- Shared type changes require checking converter, import, database, property detail, report, and PDF/JSON consumers.

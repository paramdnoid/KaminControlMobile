# Genesis Bundle Contract

## Current Flow

- Input: `Daten.zip` containing Genesis MDB files.
- Converter output: `genesis-export-v2.json` or transport ZIP.
- Mobile import: user selects the prepared bundle in the Import screen.

## Converter Responsibilities

- Read MDB tables and produce normalized mobile data.
- Build stable `sourceKey` values for matching properties.
- Preserve table counts and warnings for auditability.
- Map installations, planned work, invoices, invoice lines, PDFs, and history.
- Strip raw audit-only fields from the mobile bundle unless the task explicitly needs them.

## Mobile Bundle Expectations

- The mobile app consumes typed `GenesisBundleV1` data from `src/types.ts`.
- Imported Genesis context is read-only in the mobile UI.
- Planned work suggestions may become report work items; Genesis source records are not edited.
- Real MDB/ZIP/PDF artifacts are sensitive and should not be inspected without explicit user request.

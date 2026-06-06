# Feature Planning Reference

## Product Scope

- V1 is a local offline app for field rapports.
- There is no login, cloud backend, direct Genesis sync, or server API in the current scope.
- Genesis data flow is `Genesis -> Desktop Converter -> Mobile Bundle -> Mobile App -> PDF/JSON Rapport`.

## Domain Model

- `CustomerProperty`: customer number, property address, roles, fuel/system data, cleaning months, source metadata.
- `ServiceReport`: property-bound report with cleaning date, time range, chimney sweep name, notes, status, timestamps.
- `WorkItem`: report position with quantity, description, TP, amount, minutes, sort order.
- `GenesisImportRun`: import metadata, schema/converter version, table counts, warnings.
- `GenesisInstallation`, `GenesisInvoice`, `GenesisInvoiceLine`, `GenesisPdfDocument`, `GenesisPlannedWork`, `GenesisHistoryEntry`: read-only context imported from Genesis.
- `GenesisPropertyContext`: property-level aggregate used by property detail and report suggestion flows.

## Planning Checklist

- Goal and success criteria.
- User workflow affected: import, search, property detail, report wizard, PDF/share, converter.
- Contract impact: `src/types.ts`, database rows, bundle schema, report JSON, PDF HTML.
- Persistence impact: native SQLite, web fallback store, autosave, status transitions.
- Genesis impact: table mapping, source keys, warnings, audit fields, converter tests.
- UI impact: loading/empty/error/saving states, mobile layout, accessibility labels.
- Validation: exact package scripts, manual smoke checks, known missing coverage.
- Handoff requirements and owner agent.

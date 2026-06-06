---
name: project_n_plus_one_fix
description: TASK-01/02 — batched query pattern used to fix N+1 in listReports and add propertyId filtering
metadata:
  type: project
---

`listReports` native path was fixed from N+1 to a 3-query batch pattern:

1. Fetch all matching `service_reports` rows (with optional `status` and/or `property_id` WHERE conditions).
2. If empty → return `[]` immediately.
3. In `Promise.all`: fetch all needed `customer_properties` via `WHERE id IN (...)` + all `work_items` via `WHERE report_id IN (...)`.
4. Build a `Map<id, PropertyRow>` and a `Map<reportId, WorkItemRow[]>` in memory.
5. Walk `reportRows` and assemble `ReportBundle[]` from the maps.

The public signature was extended to `listReports(status?: ReportStatus, propertyId?: string)`:
- Native: adds `AND property_id = ?` to the SQL WHERE clause when `propertyId` is provided.
- Web: adds `.filter((report) => !propertyId || report.propertyId === propertyId)` before the bundle map.

**Why:** The original loop called `getReportBundle(row.id)` per report, which issued 2 additional SQL queries per row (1 for property, 1 for work items). With 100 reports that was 201 sequential round-trips, which is extremely slow on device.

**How to apply:** Use the same batch-query pattern (IN placeholders with `...spread`) whenever fetching related rows for a variable-length parent result set. Never loop inside an async DB call if a single parameterized IN query can replace it.

Related: [[project_quality_audit_2026_06]]

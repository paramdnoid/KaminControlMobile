# Report Export Contract

## Outputs

- PDF/share path uses `buildReportHtml` and `shareReportPdf`.
- Structured JSON uses `buildStructuredReport`.
- Current JSON schema marker: `kamincontrolmobile.report.v1`.

## Safety Rules

- Escape customer, property, note, and work item text before inserting into HTML.
- Keep generated PDFs and copied reports out of git.
- Save current report/work items before sharing.
- Do not mark exported until the status transition is intentional and tied to a successful export/share workflow.

## Review Checklist

- Completion requires cleaning date and chimney sweep name.
- Empty work items are filtered before completion/export.
- Total minutes calculation handles comma/decimal input safely.
- PDF layout avoids page-break problems for repeated fields and rows.
- JSON includes property, report, and work items.

# Security And Privacy Rules

- Customer PDFs, copied reports, Genesis ZIP/MDB files, generated bundles, and `artifacts/` are sensitive local data.
- Do not read, summarize, upload, modify, or delete sensitive artifacts unless the user explicitly asks for that exact file or artifact task.
- Never print secrets, signing keys, credentials, or local customer records into chat, logs, commits, or generated docs.
- Use hooks and settings as enforcement surfaces. Prompt instructions alone are not enough for sensitive path and destructive command protection.
- When a task requires sensitive artifact access, state the access explicitly and keep output to the minimum needed for the task.

# Security And Privacy Reference

## Sensitive Paths

- `.env`, `.env.*`, keys, certificates, `key.properties`, provisioning profiles, signing files.
- `artifacts/`, `pdfs/`, copied reports, generated PDFs.
- `genesis-export-v*.json`, `genesis-mobile-export/`, `genesis-mobile-export.zip`.
- `Daten.zip`, `*.MDB`, `*.mdb`, Genesis backup ZIPs, and Sicherung ZIPs.
- Build output: `dist/`, `.desktop-build/`, generated native folders.

## Command Risks

- Destructive git: `git reset --hard`, `git clean -fdx`, path restore commands.
- Recursive/forced remove: `rm -rf`.
- Privilege or ownership changes: `sudo`, recursive `chown`, `chmod -R 777`.
- Remote shell execution: `curl|sh`, `wget|bash`.
- Publication/deployment: `npm publish`, `eas submit`.

## Review Expectations

- Prefer hooks/settings for deterministic enforcement.
- Keep root files and directory names covered, not only nested `/**` globs.
- Keep user output minimal when sensitive data is involved.
- Do not commit local artifacts or generated customer data.
- Make artifact access explicit when the user asks for it.

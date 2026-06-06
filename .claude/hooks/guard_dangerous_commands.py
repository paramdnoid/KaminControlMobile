#!/usr/bin/env python3
"""Block destructive or sensitive Bash commands before Claude runs them."""

from __future__ import annotations

import fnmatch
import json
import re
import shlex
import sys
from pathlib import Path


SENSITIVE_GLOBS = [
    ".env",
    ".env.*",
    "**/.env",
    "**/.env.*",
    "*.pem",
    "*.key",
    "*.p8",
    "*.p12",
    "*.jks",
    "artifacts/**",
    "pdfs/**",
    "dist/**",
    ".desktop-build/**",
    "genesis-export-v*.json",
    "genesis-mobile-export/**",
    "genesis-mobile-export.zip",
    "Daten.zip",
    "*.MDB",
    "*.mdb",
    "2026-06-01 - Sicherung Genesis - KOMPLETT - 001.zip",
]

# Paths that match a sensitive glob above but are explicitly permitted.
# Screenshots are UI captures, not customer data, so PNGs under artifacts/
# are exempted (compared case-insensitively). Checked per path, so a command
# that also touches a genuinely sensitive file is still blocked.
ALLOWED_GLOBS = [
    "artifacts/*.png",
    "artifacts/**/*.png",
]

BLOCKED_REGEXES = [
    (r"(^|[;&|]\s*)rm\s+(-[^\s]*r[^\s]*\s+|--recursive\b)", "recursive remove"),
    (r"\bgit\s+reset\s+--hard\b", "git reset --hard"),
    (r"\bgit\s+clean\s+-[^\s]*[fdx][^\s]*", "git clean destructive mode"),
    (r"\bgit\s+checkout\s+--\s+", "git checkout -- path restore"),
    (r"\bgit\s+restore\b", "git restore"),
    (r"\bgit\s+stash\s+(drop|clear)\b", "git stash destructive mode"),
    (r"(^|[;&|]\s*)sudo\b", "sudo"),
    (r"\bchmod\s+-R\s+777\b", "chmod -R 777"),
    (r"\bchown\s+-R\b", "recursive chown"),
    (r"\bdd\s+.*\bof=", "dd raw write"),
    (r"\bdiskutil\s+(erase|partition|apfs\s+delete)", "disk erase/partition"),
    (r"\bmkfs(\.|\s)", "mkfs"),
    (r"\bnpm\s+publish\b", "npm publish"),
    (r"\beas\s+submit\b", "EAS submit"),
    (r"\b(curl|wget)\b.*\|\s*(sh|bash|zsh)\b", "remote shell pipe"),
]


def read_payload() -> dict:
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def command_from(payload: dict) -> str:
    tool_input = payload.get("tool_input")
    if isinstance(tool_input, dict):
        command = tool_input.get("command")
        if isinstance(command, str):
            return command
    command = payload.get("command")
    return command if isinstance(command, str) else ""


def command_mentions_sensitive_path(command: str) -> str | None:
    try:
        parts = shlex.split(command)
    except ValueError:
        parts = command.split()

    candidates = []
    for part in parts:
        if part.startswith("-"):
            continue
        cleaned = part.strip("'\"")
        if "/" in cleaned or "." in cleaned or cleaned.lower().endswith((".zip", ".mdb", ".json")):
            candidates.append(cleaned)

    for candidate in candidates:
        normalized = candidate.replace("\\", "/").lstrip("./")
        if any(fnmatch.fnmatch(normalized.lower(), allowed) for allowed in ALLOWED_GLOBS):
            continue
        for pattern in SENSITIVE_GLOBS:
            if fnmatch.fnmatch(normalized, pattern) or fnmatch.fnmatch(Path(normalized).name, pattern):
                return candidate
    return None


def main() -> int:
    command = command_from(read_payload()).strip()
    if not command:
        return 0

    compact = re.sub(r"\s+", " ", command)
    for pattern, reason in BLOCKED_REGEXES:
        if re.search(pattern, compact, flags=re.IGNORECASE):
            print(f"Blocked dangerous command ({reason}): {compact}", file=sys.stderr)
            return 2

    sensitive = command_mentions_sensitive_path(command)
    if sensitive:
        print(f"Blocked command touching sensitive/generated path: {sensitive}", file=sys.stderr)
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Block direct Claude file-tool access to sensitive local artifacts."""

from __future__ import annotations

import fnmatch
import json
import os
import sys
from pathlib import Path
from typing import Iterable


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


def read_payload() -> dict:
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def iter_paths(value: object) -> Iterable[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from iter_paths(item)
    elif isinstance(value, dict):
        for key, item in value.items():
            if key in {"file_path", "path", "paths"}:
                yield from iter_paths(item)
            elif isinstance(item, (dict, list)):
                yield from iter_paths(item)


def normalize(path: str, cwd: str) -> str:
    expanded = os.path.expanduser(path)
    try:
        absolute = Path(expanded).resolve()
        root = Path(cwd).resolve()
        if absolute == root:
            return "."
        if absolute.is_relative_to(root):
            return absolute.relative_to(root).as_posix()
    except Exception:
        pass
    return path.replace("\\", "/").lstrip("./")


def is_sensitive(path: str) -> bool:
    normalized = path.replace("\\", "/").lstrip("./")
    basename = Path(normalized).name
    for pattern in SENSITIVE_GLOBS:
        if fnmatch.fnmatch(normalized, pattern) or fnmatch.fnmatch(basename, pattern):
            return True
    return False


def main() -> int:
    payload = read_payload()
    cwd = payload.get("cwd") if isinstance(payload.get("cwd"), str) else os.getcwd()
    tool_input = payload.get("tool_input") if isinstance(payload.get("tool_input"), dict) else payload
    paths = sorted({normalize(path, cwd) for path in iter_paths(tool_input)})

    for path in paths:
        if is_sensitive(path):
            print(f"Blocked sensitive/generated path access: {path}", file=sys.stderr)
            return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

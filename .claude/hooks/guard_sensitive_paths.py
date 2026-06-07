#!/usr/bin/env python3
"""Block direct Claude file-tool access to sensitive local artifacts."""

from __future__ import annotations

import json
import os
import sys
from typing import Iterable

from sensitive_paths import is_sensitive, normalize_path


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


def main() -> int:
    payload = read_payload()
    cwd = payload.get("cwd") if isinstance(payload.get("cwd"), str) else os.getcwd()
    tool_input = payload.get("tool_input") if isinstance(payload.get("tool_input"), dict) else payload
    paths = sorted({normalize_path(path, cwd) for path in iter_paths(tool_input)})

    for path in paths:
        if is_sensitive(path):
            print(f"Blocked sensitive/generated path access: {path}", file=sys.stderr)
            return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

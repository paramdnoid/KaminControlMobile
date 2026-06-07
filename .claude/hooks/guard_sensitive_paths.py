#!/usr/bin/env python3
"""Block direct Claude file-tool access to sensitive local artifacts."""

from __future__ import annotations

import json
import os
import sys
from typing import Iterable

from sensitive_paths import is_allowed_sensitive_exception, is_sensitive, normalize_path


def deny(reason: str) -> int:
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": reason,
                }
            }
        )
    )
    return 0


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


def iter_tool_paths(tool_name: str, tool_input: dict) -> Iterable[str]:
    yield from iter_paths(tool_input)
    if tool_name == "Glob":
        pattern = tool_input.get("pattern")
        if isinstance(pattern, str):
            yield pattern
            base_path = tool_input.get("path")
            if isinstance(base_path, str) and not os.path.isabs(pattern):
                yield os.path.join(base_path, pattern)


def main() -> int:
    payload = read_payload()
    cwd = payload.get("cwd") if isinstance(payload.get("cwd"), str) else os.getcwd()
    tool_input = payload.get("tool_input") if isinstance(payload.get("tool_input"), dict) else payload
    tool_name = payload.get("tool_name") if isinstance(payload.get("tool_name"), str) else ""
    paths = sorted({normalize_path(path, cwd) for path in iter_tool_paths(tool_name, tool_input)})

    for path in paths:
        if is_allowed_sensitive_exception(path):
            continue
        if is_sensitive(path):
            return deny(f"Blocked sensitive/generated path access: {path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

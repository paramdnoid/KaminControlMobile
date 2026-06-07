#!/usr/bin/env python3
"""Record which validation surfaces changed after Claude edits files."""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from validation_surfaces import empty_surfaces, git_changed_paths, surfaces_for_paths


PROJECT_DIR = Path(os.environ.get("CLAUDE_PROJECT_DIR", ".")).resolve()
STATE_PATH = PROJECT_DIR / ".claude/tmp/validation-needed.json"


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


def command_from(payload: dict) -> str:
    tool_input = payload.get("tool_input")
    if isinstance(tool_input, dict):
        command = tool_input.get("command")
        if isinstance(command, str):
            return command
    command = payload.get("command")
    return command if isinstance(command, str) else ""


def command_may_modify_files(command: str) -> bool:
    compact = re.sub(r"\s+", " ", command).strip()
    if not compact:
        return False
    mutation_patterns = [
        r"(^|[;&|]\s*)(cp|mv|rm|mkdir|touch)\b",
        r"(^|[;&|]\s*)git\s+(add|commit|merge|rebase|cherry-pick|mv|rm|checkout|restore|stash)\b",
        r"\bnpm\s+run\s+lint:fix\b",
        r"\beslint\b.*\s--fix\b",
        r"\bprettier\b.*\s(--write|-w)\b",
        r"\bsed\b.*\s-i(\s|$)",
        r"\bperl\b.*\s-pi\b",
        r"(^|[;&|]\s*)tee\b",
        r"(^|[;&|]\s*)(python3?|node|tsx|sh|bash|zsh)\b",
        r"(^|[^<>])>>?\s*[^&\s]",
    ]
    return any(re.search(pattern, compact, flags=re.IGNORECASE) for pattern in mutation_patterns)


def normalize(path: str, cwd: str) -> str:
    expanded = os.path.expanduser(path)
    try:
        absolute = Path(expanded).resolve()
        root = Path(cwd).resolve()
        if absolute.is_relative_to(root):
            return absolute.relative_to(root).as_posix()
    except Exception:
        pass
    return path.replace("\\", "/").lstrip("./")


def load_state() -> dict:
    if not STATE_PATH.exists():
        return {
            "paths": [],
            "surfaces": empty_surfaces(),
        }
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"paths": [], "surfaces": {}}


def main() -> int:
    payload = read_payload()
    cwd = payload.get("cwd") if isinstance(payload.get("cwd"), str) else os.getcwd()
    tool_input = payload.get("tool_input") if isinstance(payload.get("tool_input"), dict) else payload
    tool_name = payload.get("tool_name") if isinstance(payload.get("tool_name"), str) else ""
    if tool_name == "Bash":
        if not command_may_modify_files(command_from(payload)):
            return 0
        changed = sorted(git_changed_paths(PROJECT_DIR))
    else:
        changed = sorted({normalize(path, cwd) for path in iter_paths(tool_input)})
    if not changed:
        return 0

    state = load_state()
    state_paths = set(state.get("paths", []))
    state_paths.update(changed)
    surfaces = {
        **empty_surfaces(),
        **state.get("surfaces", {}),
    }
    surfaces.update({key: surfaces[key] or value for key, value in surfaces_for_paths(changed).items()})

    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(
        json.dumps(
            {
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "paths": sorted(state_paths),
                "surfaces": surfaces,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

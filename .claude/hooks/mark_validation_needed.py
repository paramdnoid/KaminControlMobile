#!/usr/bin/env python3
"""Record which validation surfaces changed after Claude edits files."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


STATE_PATH = Path(".claude/tmp/validation-needed.json")


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
        if absolute.is_relative_to(root):
            return absolute.relative_to(root).as_posix()
    except Exception:
        pass
    return path.replace("\\", "/").lstrip("./")


def load_state() -> dict:
    if not STATE_PATH.exists():
        return {
            "paths": [],
            "surfaces": {
                "config": False,
                "app": False,
                "converter": False,
                "report": False,
                "docs": False,
            },
        }
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"paths": [], "surfaces": {}}


def classify(path: str) -> set[str]:
    surfaces: set[str] = set()
    if path == "CLAUDE.md" or path == ".gitignore" or path.startswith(".claude/"):
        surfaces.add("config")
    if path == "README.md" or path.startswith("docs/") or path.startswith(".claude/") or path == "CLAUDE.md":
        surfaces.add("docs")
    if (
        path.startswith("app/")
        or path.startswith("src/")
        or path in {"package.json", "package-lock.json", "tsconfig.json", "app.json", "metro.config.js"}
    ):
        surfaces.add("app")
    if path.startswith("desktop-converter/"):
        surfaces.add("converter")
    if path.startswith("src/pdf/") or path.startswith("app/report/"):
        surfaces.add("report")
    return surfaces


def main() -> int:
    payload = read_payload()
    cwd = payload.get("cwd") if isinstance(payload.get("cwd"), str) else os.getcwd()
    tool_input = payload.get("tool_input") if isinstance(payload.get("tool_input"), dict) else payload
    changed = sorted({normalize(path, cwd) for path in iter_paths(tool_input)})
    if not changed:
        return 0

    state = load_state()
    state_paths = set(state.get("paths", []))
    state_paths.update(changed)
    surfaces = {
        "config": False,
        "app": False,
        "converter": False,
        "report": False,
        "docs": False,
        **state.get("surfaces", {}),
    }
    for path in changed:
        for surface in classify(path):
            surfaces[surface] = True

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

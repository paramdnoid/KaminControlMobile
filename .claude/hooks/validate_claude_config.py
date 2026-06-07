#!/usr/bin/env python3
"""Validate Claude config wiring, hook gates, and validation marker flow."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


PROJECT_DIR = Path(os.environ.get("CLAUDE_PROJECT_DIR", Path.cwd())).resolve()
STATE_PATH = PROJECT_DIR / ".claude/tmp/validation-needed.json"


def run(command: list[str], *, input_payload: dict | None = None, timeout: int = 180) -> subprocess.CompletedProcess[str]:
    env = {**os.environ, "CLAUDE_PROJECT_DIR": str(PROJECT_DIR)}
    return subprocess.run(
        command,
        cwd=PROJECT_DIR,
        env=env,
        input=json.dumps(input_payload) if input_payload is not None else None,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        check=False,
    )


def require_ok(result: subprocess.CompletedProcess[str], label: str) -> None:
    if result.returncode != 0:
        raise AssertionError(f"{label} failed with exit {result.returncode}\n{result.stdout}")


def validate_marker_and_stop_gate() -> None:
    backup = STATE_PATH.read_text(encoding="utf-8") if STATE_PATH.exists() else None
    try:
        if STATE_PATH.exists():
            STATE_PATH.unlink()

        marker_payload = {
            "cwd": str(PROJECT_DIR),
            "hook_event_name": "PostToolUse",
            "tool_name": "Edit",
            "tool_input": {"file_path": str(PROJECT_DIR / "CLAUDE.md")},
        }
        require_ok(
            run([sys.executable, ".claude/hooks/mark_validation_needed.py"], input_payload=marker_payload),
            "validation marker hook",
        )

        if not STATE_PATH.exists():
            raise AssertionError("validation marker hook did not create .claude/tmp/validation-needed.json")

        state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        if "CLAUDE.md" not in state.get("paths", []):
            raise AssertionError(f"validation marker missing CLAUDE.md path: {state}")
        surfaces = state.get("surfaces", {})
        if not surfaces.get("config") or not surfaces.get("docs"):
            raise AssertionError(f"validation marker did not classify config/docs surfaces: {state}")

        stop_payload = {
            "cwd": str(PROJECT_DIR),
            "hook_event_name": "Stop",
            "stop_hook_active": False,
            "last_assistant_message": "config validation simulation",
            "background_tasks": [],
            "session_crons": [],
        }
        stop_result = run([sys.executable, ".claude/hooks/quality_gate_stop.py"], input_payload=stop_payload)
        require_ok(stop_result, "quality gate stop hook")
        try:
            stop_output = json.loads(stop_result.stdout)
        except json.JSONDecodeError:
            stop_output = None
        if isinstance(stop_output, dict) and stop_output.get("decision") == "block":
            raise AssertionError(f"quality gate stop hook blocked validation\n{stop_result.stdout}")
        if STATE_PATH.exists():
            raise AssertionError("quality gate stop hook did not clear validation-needed marker")
    finally:
        if backup is not None:
            STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
            STATE_PATH.write_text(backup, encoding="utf-8")
        elif STATE_PATH.exists():
            STATE_PATH.unlink()


def main() -> int:
    validate_marker_and_stop_gate()
    print("Claude config validation marker and stop-gate simulation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

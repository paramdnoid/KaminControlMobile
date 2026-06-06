#!/usr/bin/env python3
"""Run the fast project gates required by recent Claude edits."""

from __future__ import annotations

import json
import os
import py_compile
import subprocess
import sys
from pathlib import Path


STATE_PATH = Path(".claude/tmp/validation-needed.json")


def run(command: list[str], timeout: int = 120) -> tuple[bool, str]:
    result = subprocess.run(
        command,
        cwd=Path.cwd(),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        check=False,
    )
    output = result.stdout.strip()
    return result.returncode == 0, output


def validate_json() -> tuple[bool, str]:
    try:
        json.loads(Path(".claude/settings.json").read_text(encoding="utf-8"))
    except Exception as error:
        return False, f".claude/settings.json is invalid JSON: {error}"
    return True, "settings JSON ok"


def validate_settings_schema() -> tuple[bool, str]:
    ok, output = run(["npm", "run", "claude:validate-settings"], timeout=45)
    return ok, output or "Claude settings schema validation ok"


def validate_hooks_compile() -> tuple[bool, str]:
    failures = []
    for script in sorted(Path(".claude/hooks").glob("*.py")):
        try:
            py_compile.compile(str(script), doraise=True)
        except py_compile.PyCompileError as error:
            failures.append(f"{script}: {error.msg}")
    if failures:
        return False, "\n".join(failures)
    return True, "hook Python compile ok"


def validate_agent_skill_links() -> tuple[bool, str]:
    failures = []
    for agent in sorted(Path(".claude/agents").glob("*.md")):
        text = agent.read_text(encoding="utf-8")
        if not text.startswith("---"):
            failures.append(f"{agent}: missing frontmatter")
            continue
        parts = text.split("---", 2)
        if len(parts) < 3:
            failures.append(f"{agent}: incomplete frontmatter")
            continue
        lines = parts[1].splitlines()
        in_skills = False
        for line in lines:
            stripped = line.strip()
            if stripped == "skills:":
                in_skills = True
                continue
            if in_skills and stripped.startswith("- "):
                skill = stripped[2:].strip()
                if not Path(".claude/skills", skill, "SKILL.md").exists():
                    failures.append(f"{agent}: missing skill {skill}")
                continue
            if in_skills and stripped and not line.startswith((" ", "\t")):
                in_skills = False
    if failures:
        return False, "\n".join(failures)
    return True, "agent skill links ok"


def config_gate() -> tuple[bool, str]:
    checks = [validate_json, validate_settings_schema, validate_hooks_compile, validate_agent_skill_links]
    messages = []
    for check in checks:
        ok, message = check()
        messages.append(message)
        if not ok:
            return False, "\n".join(messages)
    ok, output = run(["git", "diff", "--check", "--", "CLAUDE.md", ".claude", ".gitignore"], timeout=30)
    messages.append(output or "git diff --check ok")
    return ok, "\n".join(messages)


def load_state() -> dict | None:
    if not STATE_PATH.exists():
        return None
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return {"surfaces": {"config": True}, "error": str(error)}


def main() -> int:
    state = load_state()
    if not state:
        return 0

    surfaces = state.get("surfaces", {})
    commands: list[list[str]] = []
    reports: list[str] = []

    if surfaces.get("config"):
        ok, message = config_gate()
        reports.append(message)
        if not ok:
            print("\n\n".join(reports), file=sys.stderr)
            return 2

    if surfaces.get("app") or surfaces.get("report") or surfaces.get("converter"):
        commands.append(["npm", "run", "typecheck"])
    if surfaces.get("converter"):
        commands.extend([["npm", "run", "converter:test"], ["npm", "run", "converter:build"]])

    for command in commands:
        ok, output = run(command, timeout=180)
        reports.append(f"$ {' '.join(command)}\n{output}")
        if not ok:
            print("\n\n".join(reports), file=sys.stderr)
            return 2

    try:
        STATE_PATH.unlink()
    except OSError:
        pass

    if reports:
        print("Quality gates passed:\n" + "\n\n".join(reports))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

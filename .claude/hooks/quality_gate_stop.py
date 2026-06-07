#!/usr/bin/env python3
"""Run the fast project gates required by recent Claude edits."""

from __future__ import annotations

import json
import os
import py_compile
import subprocess
import sys
from pathlib import Path

from validation_surfaces import empty_surfaces, git_changed_paths, surfaces_for_paths


PROJECT_DIR = Path(os.environ.get("CLAUDE_PROJECT_DIR", Path.cwd())).resolve()
STATE_PATH = PROJECT_DIR / ".claude/tmp/validation-needed.json"
READ_ONLY_SKILLS = {"diff-review", "plan-feature", "security-privacy-check", "verify-quality"}


def run(command: list[str], timeout: int = 120) -> tuple[bool, str]:
    result = subprocess.run(
        command,
        cwd=PROJECT_DIR,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        check=False,
    )
    output = result.stdout.strip()
    return result.returncode == 0, output


def block(reason: str) -> int:
    print(json.dumps({"decision": "block", "reason": reason}))
    return 0


def validate_json() -> tuple[bool, str]:
    settings_paths = [PROJECT_DIR / ".claude/settings.json", PROJECT_DIR / ".claude/settings.local.json"]
    for settings_path in settings_paths:
        if not settings_path.exists():
            continue
        try:
            json.loads(settings_path.read_text(encoding="utf-8"))
        except Exception as error:
            relative = settings_path.relative_to(PROJECT_DIR)
            return False, f"{relative} is invalid JSON: {error}"
    return True, "settings JSON ok"


def validate_settings_schema() -> tuple[bool, str]:
    ok, output = run(["npm", "run", "claude:validate-settings"], timeout=45)
    return ok, output or "Claude settings schema validation ok"


def validate_hooks_compile() -> tuple[bool, str]:
    failures = []
    for script in sorted((PROJECT_DIR / ".claude/hooks").glob("*.py")):
        try:
            py_compile.compile(str(script), doraise=True)
        except py_compile.PyCompileError as error:
            failures.append(f"{script.relative_to(PROJECT_DIR)}: {error.msg}")
    if failures:
        return False, "\n".join(failures)
    return True, "hook Python compile ok"


def validate_agent_skill_links() -> tuple[bool, str]:
    failures = []
    for agent in sorted((PROJECT_DIR / ".claude/agents").glob("*.md")):
        text = agent.read_text(encoding="utf-8")
        relative_agent = agent.relative_to(PROJECT_DIR)
        if not text.startswith("---"):
            failures.append(f"{relative_agent}: missing frontmatter")
            continue
        parts = text.split("---", 2)
        if len(parts) < 3:
            failures.append(f"{relative_agent}: incomplete frontmatter")
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
                if not (PROJECT_DIR / ".claude/skills" / skill / "SKILL.md").exists():
                    failures.append(f"{relative_agent}: missing skill {skill}")
                continue
            if in_skills and stripped and not line.startswith((" ", "\t")):
                in_skills = False
    if failures:
        return False, "\n".join(failures)
    return True, "agent skill links ok"


def frontmatter(text: str) -> list[str]:
    if not text.startswith("---"):
        return []
    parts = text.split("---", 2)
    return parts[1].splitlines() if len(parts) >= 3 else []


def frontmatter_values(lines: list[str], key: str) -> list[str]:
    values: list[str] = []
    prefix = f"{key}:"
    in_list = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(prefix):
            remainder = stripped[len(prefix) :].strip()
            in_list = not bool(remainder)
            if remainder:
                values.extend(remainder.replace(",", " ").split())
            continue
        if in_list and stripped.startswith("- "):
            values.append(stripped[2:].strip())
            continue
        if in_list and stripped and not line.startswith((" ", "\t")):
            in_list = False
    return values


def validate_skill_frontmatter() -> tuple[bool, str]:
    failures: list[str] = []
    for skill_path in sorted((PROJECT_DIR / ".claude/skills").glob("*/SKILL.md")):
        skill_name = skill_path.parent.name
        relative = skill_path.relative_to(PROJECT_DIR)
        lines = frontmatter(skill_path.read_text(encoding="utf-8"))
        allowed_tools = frontmatter_values(lines, "allowed-tools")
        if "Bash" in allowed_tools:
            failures.append(f"{relative}: bare Bash in allowed-tools")
        if skill_name in READ_ONLY_SKILLS:
            disallowed_tools = set(frontmatter_values(lines, "disallowed-tools"))
            missing = sorted({"Edit", "MultiEdit", "Write"} - disallowed_tools)
            if missing:
                failures.append(f"{relative}: missing read-only disallowed-tools {', '.join(missing)}")
    if failures:
        return False, "\n".join(failures)
    return True, "skill frontmatter policy ok"


def state_from_git() -> dict | None:
    paths = sorted(git_changed_paths(PROJECT_DIR))
    if not paths:
        return None
    surfaces = surfaces_for_paths(paths)
    if not any(surfaces.values()):
        return None
    return {"paths": paths, "surfaces": surfaces, "source": "git-status"}


def config_gate() -> tuple[bool, str]:
    checks = [
        validate_json,
        validate_settings_schema,
        validate_hooks_compile,
        validate_agent_skill_links,
        validate_skill_frontmatter,
    ]
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
    state = load_state() or state_from_git()
    if not state:
        return 0

    surfaces = state.get("surfaces", {})
    commands: list[list[str]] = []
    reports: list[str] = []

    if surfaces.get("config"):
        ok, message = config_gate()
        reports.append(message)
        if not ok:
            return block("\n\n".join(reports))

    if surfaces.get("app") or surfaces.get("report") or surfaces.get("converter"):
        commands.append(["npm", "run", "typecheck"])
    if surfaces.get("app") or surfaces.get("report"):
        commands.append(["npm", "run", "lint"])
    if surfaces.get("converter"):
        commands.extend([["npm", "run", "converter:test"], ["npm", "run", "converter:build"]])

    for command in commands:
        ok, output = run(command, timeout=180)
        reports.append(f"$ {' '.join(command)}\n{output}")
        if not ok:
            return block("\n\n".join(reports))

    try:
        STATE_PATH.unlink()
    except OSError:
        pass

    if reports:
        print("Quality gates passed:\n" + "\n\n".join(reports))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

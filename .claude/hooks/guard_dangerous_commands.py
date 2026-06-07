#!/usr/bin/env python3
"""Block destructive or sensitive Bash commands before Claude runs them."""

from __future__ import annotations

import json
import re
import shlex
import sys

from sensitive_paths import is_allowed_sensitive_exception, is_sensitive, strip_current_dir_prefix

BLOCKED_REGEXES = [
    (r"(^|[;&|]\s*)rm\s+(-[^\s]*r[^\s]*\s+|--recursive\b)", "recursive remove"),
    (r"\bgit\s+reset\s+--hard\b", "git reset --hard"),
    (r"\bgit\s+clean\s+-[^\s]*[fdx][^\s]*", "git clean destructive mode"),
    (r"\bgit\s+checkout\s+--\s+", "git checkout -- path restore"),
    (r"\bgit\s+restore\b", "git restore"),
    (r"\bgit\s+stash\s+(drop|clear)\b", "git stash destructive mode"),
    (r"\bfind\b.*\s-delete\b", "find -delete"),
    (r"\bfind\b.*\s-exec\s+(rm|mv|cp|chmod|chown)\b", "find -exec destructive command"),
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

MUTATING_SEGMENT_RE = re.compile(r"(^|[;&|]{1,2}\s*)(cp|mv|rm|mkdir|touch|tee)\b", re.IGNORECASE)
WRITE_REDIRECT_RE = re.compile(r"(^|[^<])(?P<operator>>>?|[12]>)\s*(?P<target>(?!&)[^\s]+)")
TEMP_WRITE_PREFIXES = (".claude/tmp/",)
SCREENSHOT_DIR = ".claude/tmp/screenshots/"


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


def command_from(payload: dict) -> str:
    tool_input = payload.get("tool_input")
    if isinstance(tool_input, dict):
        command = tool_input.get("command")
        if isinstance(command, str):
            return command
    command = payload.get("command")
    return command if isinstance(command, str) else ""


def shell_parts(command: str) -> list[str]:
    try:
        return shlex.split(command)
    except ValueError:
        return command.split()


def normalize_shell_path(path: str) -> str:
    return strip_current_dir_prefix(path.strip("'\""))


def is_temp_screenshot_target(path: str) -> bool:
    normalized = normalize_shell_path(path)
    return normalized in {
        ".claude/tmp/screenshots",
        ".claude/tmp/screenshots/*",
        ".claude/tmp/screenshots/*.png",
    } or normalized.startswith(SCREENSHOT_DIR)


def is_allowed_temp_command(command: str) -> bool:
    parts = shell_parts(command)
    if not parts:
        return False

    executable = parts[0]
    if executable == "rm":
        targets = [part for part in parts[1:] if not part.startswith("-")]
        options = [part for part in parts[1:] if part.startswith("-")]
        return bool(targets) and all(option in {"-f", "--force"} for option in options) and all(
            is_temp_screenshot_target(target) for target in targets
        )

    if executable == "mkdir":
        targets = [part for part in parts[1:] if not part.startswith("-")]
        options = [part for part in parts[1:] if part.startswith("-")]
        return bool(targets) and all(option in {"-p", "--parents"} for option in options) and all(
            is_temp_screenshot_target(target) for target in targets
        )

    return False


def command_mentions_mutating_segment(command: str) -> str | None:
    if is_allowed_temp_command(command):
        return None

    compact = re.sub(r"\s+", " ", command).strip()
    match = MUTATING_SEGMENT_RE.search(compact)
    if match:
        return match.group(2)
    return None


def command_writes_outside_temp(command: str) -> str | None:
    for match in WRITE_REDIRECT_RE.finditer(command):
        target = normalize_shell_path(match.group("target"))
        if target.startswith(TEMP_WRITE_PREFIXES):
            continue
        return target
    return None


def command_mentions_sensitive_path(command: str) -> str | None:
    parts = shell_parts(command)

    candidates = []
    for part in parts:
        if part in {"|", "||", "&&", ";", ">", ">>", "<", "2>", "2>>"} or part.startswith("-"):
            continue
        cleaned = part.strip("'\"")
        cleaned = cleaned.lstrip("<>")
        if cleaned and not re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", cleaned):
            candidates.append(cleaned)

    for candidate in candidates:
        normalized = strip_current_dir_prefix(candidate)
        if is_allowed_sensitive_exception(normalized):
            continue
        if is_sensitive(normalized):
            return candidate
    return None


def main() -> int:
    command = command_from(read_payload()).strip()
    if not command:
        return 0

    compact = re.sub(r"\s+", " ", command)
    for pattern, reason in BLOCKED_REGEXES:
        if re.search(pattern, compact, flags=re.IGNORECASE):
            return deny(f"Blocked dangerous command ({reason}): {compact}")

    mutating_segment = command_mentions_mutating_segment(command)
    if mutating_segment:
        return deny(f"Blocked mutating shell segment ({mutating_segment}): {compact}")

    write_target = command_writes_outside_temp(command)
    if write_target:
        return deny(f"Blocked shell write redirection outside .claude/tmp: {write_target}")

    sensitive = command_mentions_sensitive_path(command)
    if sensitive:
        return deny(f"Blocked command touching sensitive/generated path: {sensitive}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

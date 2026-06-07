"""Shared sensitive-path matching for Claude Code guard hooks."""

from __future__ import annotations

import fnmatch
import os
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
    "*.mobileprovision",
    "key.properties",
    "**/key.properties",
    "artifacts",
    "artifacts/**",
    "pdfs",
    "pdfs/**",
    "dist",
    "dist/**",
    ".desktop-build",
    ".desktop-build/**",
    "genesis-export-v*.json",
    "genesis-mobile-export",
    "genesis-mobile-export/**",
    "genesis-mobile-export.zip",
    "Daten.zip",
    "*.MDB",
    "*.mdb",
    "*Genesis*.zip",
    "*Sicherung*.zip",
    "2026-06-01 - Sicherung Genesis - KOMPLETT - 001.zip",
]

# UI screenshots belong in .claude/tmp/screenshots; generated data is not.
ALLOWED_GLOBS = [
    ".claude/tmp/screenshots/*.png",
    ".claude/tmp/screenshots/**/*.png",
]


def strip_current_dir_prefix(path: str) -> str:
    normalized = path.replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized.rstrip("/") if normalized not in {"/", "."} else normalized


def normalize_path(path: str, cwd: str | None = None) -> str:
    expanded = os.path.expanduser(path)
    if cwd:
        try:
            absolute = Path(expanded).resolve()
            root = Path(cwd).resolve()
            if absolute == root:
                return "."
            if absolute.is_relative_to(root):
                return absolute.relative_to(root).as_posix()
        except Exception:
            pass
    return strip_current_dir_prefix(path)


def _matches_any(path: str, patterns: list[str]) -> bool:
    normalized = strip_current_dir_prefix(path)
    basename = Path(normalized).name
    normalized_lower = normalized.lower()
    basename_lower = basename.lower()

    for pattern in patterns:
        pattern_lower = pattern.lower()
        if fnmatch.fnmatch(normalized_lower, pattern_lower) or fnmatch.fnmatch(basename_lower, pattern_lower):
            return True
    return False


def is_allowed_sensitive_exception(path: str) -> bool:
    return _matches_any(path, ALLOWED_GLOBS)


def is_sensitive(path: str) -> bool:
    return _matches_any(path, SENSITIVE_GLOBS)

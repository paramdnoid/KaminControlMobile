"""Shared validation surface classification for Claude Code hooks."""

from __future__ import annotations

import subprocess
from pathlib import Path


SURFACE_KEYS = ("config", "app", "converter", "report", "docs")


def empty_surfaces() -> dict[str, bool]:
    return {key: False for key in SURFACE_KEYS}


def classify(path: str) -> set[str]:
    surfaces: set[str] = set()
    if path == "CLAUDE.md" or path == ".gitignore" or path.startswith(".claude/"):
        surfaces.add("config")
    if path == "README.md" or path.startswith("docs/") or path.startswith(".claude/") or path == "CLAUDE.md":
        surfaces.add("docs")
    if (
        path.startswith("app/")
        or path.startswith("src/")
        or path
        in {
            "package.json",
            "package-lock.json",
            "tsconfig.json",
            "app.json",
            "metro.config.js",
            "babel.config.js",
            "eslint.config.mjs",
            "tailwind.config.js",
            "nativewind-env.d.ts",
        }
        or (path.startswith("tsconfig.") and path.endswith(".json"))
    ):
        surfaces.add("app")
    if path.startswith("desktop-converter/"):
        surfaces.add("converter")
    if path.startswith("src/pdf/") or path.startswith("app/report/"):
        surfaces.add("report")
    return surfaces


def surfaces_for_paths(paths: list[str] | set[str] | tuple[str, ...]) -> dict[str, bool]:
    surfaces = empty_surfaces()
    for path in paths:
        for surface in classify(path):
            surfaces[surface] = True
    return surfaces


def git_changed_paths(project_dir: Path) -> set[str]:
    commands = [
        ["git", "diff", "--name-only"],
        ["git", "diff", "--name-only", "--cached"],
        ["git", "ls-files", "--others", "--exclude-standard"],
    ]
    paths: set[str] = set()
    for command in commands:
        result = subprocess.run(
            command,
            cwd=project_dir,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        if result.returncode != 0:
            continue
        paths.update(line.strip().replace("\\", "/") for line in result.stdout.splitlines() if line.strip())
    return paths

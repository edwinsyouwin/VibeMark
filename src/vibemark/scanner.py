"""Scan project files to extract a ProjectProfile."""

from __future__ import annotations

import json
from pathlib import Path

import yaml

from vibemark.models import ProjectProfile


def scan_project(directory: Path) -> ProjectProfile:
    """Scan a project directory and return a ProjectProfile."""
    profile = ProjectProfile()

    readme = _fetch_readme_local(directory)
    if readme:
        profile.readme_content = readme

    pkg = _fetch_package_json_local(directory)
    pyproj = _fetch_pyproject_toml_local(directory)

    # Parse fetched content
    parse_package_json(profile, pkg)
    parse_pyproject_toml(profile, pyproj)

    # Fallback language detection
    if not profile.language:
        profile.language = _detect_language(directory)

    # Extract name from directory if still missing
    if not profile.name:
        profile.name = directory.resolve().name

    return profile


# ── Fetch functions (local filesystem) ────────────────────────────────


def _fetch_readme_local(directory: Path) -> str:
    """Read the first README file found."""
    for name in ["README.md", "README.rst", "README.txt", "README"]:
        path = directory / name
        if path.exists():
            return path.read_text(errors="replace")[:10000]
    return ""


def _fetch_package_json_local(directory: Path) -> dict | None:
    path = directory / "package.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def _fetch_pyproject_toml_local(directory: Path) -> dict | None:
    path = directory / "pyproject.toml"
    if not path.exists():
        return None
    try:
        import sys

        if sys.version_info >= (3, 11):
            import tomllib
        else:
            try:
                import tomllib
            except ImportError:
                import tomli as tomllib  # type: ignore[no-redef]
        return tomllib.loads(path.read_text())
    except Exception:
        return None


# ── Parse functions (source-agnostic) ─────────────────────────────────


def parse_package_json(profile: ProjectProfile, pkg: dict | None) -> None:
    """Parse package.json data into a profile. Works with local or GitHub-fetched content."""
    if not pkg:
        return
    profile.name = profile.name or pkg.get("name", "")
    profile.description = profile.description or pkg.get("description", "")
    profile.repo_url = profile.repo_url or _extract_repo_url(pkg)
    profile.license = profile.license or pkg.get("license", "")
    if "dependencies" in pkg or "devDependencies" in pkg:
        profile.language = profile.language or "JavaScript"
        profile.frameworks = _detect_js_frameworks(pkg)


def parse_pyproject_toml(profile: ProjectProfile, pyproj: dict | None) -> None:
    """Parse pyproject.toml data into a profile. Works with local or GitHub-fetched content."""
    if not pyproj:
        return
    project_section = pyproj.get("project", {})
    profile.name = profile.name or project_section.get("name", "")
    profile.description = profile.description or project_section.get("description", "")
    profile.license = profile.license or _extract_pyproject_license(project_section)
    if project_section:
        profile.language = profile.language or "Python"
        profile.frameworks = profile.frameworks or _detect_py_frameworks(project_section)


# ── Helper functions ──────────────────────────────────────────────────


def _extract_repo_url(pkg: dict) -> str:
    repo = pkg.get("repository", "")
    if isinstance(repo, dict):
        return repo.get("url", "")
    return repo if isinstance(repo, str) else ""


def _extract_pyproject_license(project: dict) -> str:
    lic = project.get("license", "")
    if isinstance(lic, dict):
        return lic.get("text", lic.get("file", ""))
    return str(lic)


def _detect_js_frameworks(pkg: dict) -> list[str]:
    all_deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    frameworks = []
    known = {
        "react": "React",
        "next": "Next.js",
        "vue": "Vue",
        "nuxt": "Nuxt",
        "svelte": "Svelte",
        "@angular/core": "Angular",
        "express": "Express",
        "fastify": "Fastify",
        "tailwindcss": "Tailwind CSS",
    }
    for dep, label in known.items():
        if dep in all_deps:
            frameworks.append(label)
    return frameworks


def _detect_py_frameworks(project: dict) -> list[str]:
    deps = project.get("dependencies", [])
    if isinstance(deps, dict):
        dep_names = list(deps.keys())
    else:
        dep_names = [d.split(">")[0].split("<")[0].split("=")[0].split("[")[0].strip() for d in deps]
    frameworks = []
    known = {
        "django": "Django",
        "flask": "Flask",
        "fastapi": "FastAPI",
        "typer": "Typer",
        "streamlit": "Streamlit",
        "torch": "PyTorch",
        "tensorflow": "TensorFlow",
    }
    for dep, label in known.items():
        if dep in dep_names:
            frameworks.append(label)
    return frameworks


def _detect_language(directory: Path) -> str:
    """Heuristic language detection from file extensions."""
    extensions: dict[str, str] = {
        ".py": "Python",
        ".js": "JavaScript",
        ".ts": "TypeScript",
        ".go": "Go",
        ".rs": "Rust",
        ".rb": "Ruby",
        ".java": "Java",
        ".swift": "Swift",
    }
    counts: dict[str, int] = {}
    for ext, lang in extensions.items():
        # Check src/ and top-level, limit depth
        found = list(directory.glob(f"*{ext}")) + list(directory.glob(f"src/**/*{ext}"))
        if found:
            counts[lang] = len(found)
    if counts:
        return max(counts, key=counts.get)  # type: ignore[arg-type]
    return ""

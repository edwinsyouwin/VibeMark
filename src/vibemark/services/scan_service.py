"""Scan service — project scanning from local filesystem or raw content."""

from __future__ import annotations

from pathlib import Path

from vibemark.models import ProjectProfile, VibemarkConfig
from vibemark.scanner import (
    parse_package_json,
    parse_pyproject_toml,
    scan_project,
)


def scan_local_project(directory: Path) -> ProjectProfile:
    """Scan a local project directory."""
    return scan_project(directory)


def scan_from_raw_content(
    *,
    readme: str = "",
    package_json: dict | None = None,
    pyproject_toml: dict | None = None,
    repo_name: str = "",
    description: str = "",
    language: str = "",
    license_name: str = "",
) -> ProjectProfile:
    """Build a ProjectProfile from raw file contents (e.g. fetched via GitHub API).

    This uses the same parsing logic as local scanning but accepts pre-fetched content.
    """
    profile = ProjectProfile()

    if readme:
        profile.readme_content = readme[:10000]
    if description:
        profile.description = description
    if language:
        profile.language = language
    if license_name:
        profile.license = license_name
    if repo_name:
        profile.name = repo_name

    parse_package_json(profile, package_json)
    parse_pyproject_toml(profile, pyproject_toml)

    return profile


def scan_and_merge(directory: Path, config: VibemarkConfig) -> VibemarkConfig:
    """Scan a local project and merge results into existing config."""
    profile = scan_local_project(directory)
    config.merge_scan(profile)
    return config

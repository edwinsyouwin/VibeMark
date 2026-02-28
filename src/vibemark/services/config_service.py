"""Config service — wraps YAML config loading/saving, adds DB-backed methods for web."""

from __future__ import annotations

from pathlib import Path

from vibemark.config import find_config, load_config, save_config
from vibemark.models import VibemarkConfig


def load_project_config(directory: Path, config_path: Path | None = None) -> VibemarkConfig:
    """Load config for a project directory."""
    cfg_path = find_config(directory, config_path)
    return load_config(cfg_path)


def save_project_config(
    config: VibemarkConfig, directory: Path, config_path: Path | None = None
) -> Path:
    """Save config and return the path it was saved to."""
    cfg_path = find_config(directory, config_path)
    save_config(config, cfg_path)
    return cfg_path


def config_to_dict(config: VibemarkConfig) -> dict:
    """Serialize config to a dict (for API responses)."""
    data = config.model_dump(mode="json", exclude_defaults=False)
    if "project" in data and "readme_content" in data["project"]:
        del data["project"]["readme_content"]
    return data


def config_from_dict(data: dict) -> VibemarkConfig:
    """Deserialize config from a dict (from API requests)."""
    return VibemarkConfig.model_validate(data)

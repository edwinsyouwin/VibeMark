"""Load, save, and merge vibemark.yaml configuration."""

from __future__ import annotations

from pathlib import Path

import yaml

from vibemark.models import VibemarkConfig

DEFAULT_CONFIG_NAME = "vibemark.yaml"


def find_config(directory: Path, config_path: Path | None = None) -> Path:
    """Resolve the config file path."""
    if config_path:
        return config_path
    return directory / DEFAULT_CONFIG_NAME


def load_config(path: Path) -> VibemarkConfig:
    """Load config from a YAML file. Returns default config if file doesn't exist."""
    if not path.exists():
        return VibemarkConfig()
    raw = yaml.safe_load(path.read_text()) or {}
    return VibemarkConfig.model_validate(raw)


def save_config(config: VibemarkConfig, path: Path) -> None:
    """Save config to a YAML file."""
    data = config.model_dump(mode="json", exclude_defaults=False)
    # Remove readme_content from saved config — it's too large and re-scanned each time
    if "project" in data and "readme_content" in data["project"]:
        del data["project"]["readme_content"]
    path.write_text(yaml.dump(data, default_flow_style=False, sort_keys=False))

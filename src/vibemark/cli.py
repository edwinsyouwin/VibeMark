"""Typer CLI commands for Vibemark."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated, Optional

import typer
from rich.console import Console

from vibemark import __version__
from vibemark.models import Channel

app = typer.Typer(
    name="vibemark",
    help="Marketing automation CLI for vibe-coded projects.",
    no_args_is_help=True,
)
console = Console()


def version_callback(value: bool) -> None:
    if value:
        console.print(f"vibemark {__version__}")
        raise typer.Exit()


@app.callback()
def main(
    version: Annotated[
        Optional[bool],
        typer.Option("--version", "-v", callback=version_callback, is_eager=True, help="Show version."),
    ] = None,
) -> None:
    """Vibemark: marketing automation for vibe-coded projects."""


# ── scan ──────────────────────────────────────────────────────────────


@app.command()
def scan(
    directory: Annotated[Path, typer.Argument(help="Project directory to scan.")] = Path("."),
    config: Annotated[
        Optional[Path], typer.Option("--config", "-c", help="Path to vibemark.yaml.")
    ] = None,
) -> None:
    """Scan a project directory and display its profile."""
    from vibemark.config import find_config, load_config
    from vibemark.output import display_profile
    from vibemark.scanner import scan_project

    directory = directory.resolve()
    profile = scan_project(directory)

    # Merge with existing config if present
    cfg_path = find_config(directory, config)
    cfg = load_config(cfg_path)
    cfg.merge_scan(profile)

    display_profile(cfg.project)


# ── init ──────────────────────────────────────────────────────────────


@app.command()
def init(
    directory: Annotated[Path, typer.Argument(help="Project directory.")] = Path("."),
    config: Annotated[
        Optional[Path], typer.Option("--config", "-c", help="Path to vibemark.yaml.")
    ] = None,
    no_interactive: Annotated[
        bool, typer.Option("--no-interactive", help="Skip interactive prompts.")
    ] = False,
) -> None:
    """Initialize vibemark config by scanning a project and filling gaps interactively."""
    from vibemark.config import find_config, load_config, save_config
    from vibemark.output import display_profile
    from vibemark.scanner import scan_project

    directory = directory.resolve()
    console.print(f"[bold]Scanning [cyan]{directory}[/cyan]...[/bold]")

    profile = scan_project(directory)
    cfg_path = find_config(directory, config)
    cfg = load_config(cfg_path)
    cfg.merge_scan(profile)

    display_profile(cfg.project)

    if not no_interactive:
        _interactive_fill(cfg)

    save_config(cfg, cfg_path)
    console.print(f"\n[bold green]Config saved to {cfg_path}[/bold green]")


def _interactive_fill(cfg) -> None:  # noqa: ANN001
    """Prompt the user to fill in missing critical fields."""
    from vibemark.models import BrandVoice

    p = cfg.project
    b = cfg.brand

    if not p.name:
        p.name = typer.prompt("Project name")
    if not p.description:
        p.description = typer.prompt("Short project description")
    if not b.audience:
        b.audience = typer.prompt("Target audience (e.g. 'frontend developers')", default="developers")
    if not b.tone:
        b.tone = typer.prompt(
            "Brand tone (e.g. 'casual and fun', 'professional')",
            default="professional yet approachable",
        )
    if not b.tagline:
        tagline = typer.prompt("Tagline (optional, press Enter to skip)", default="")
        if tagline:
            b.tagline = tagline
    keywords = typer.prompt("Keywords (comma-separated, optional)", default="")
    if keywords:
        b.keywords = [k.strip() for k in keywords.split(",") if k.strip()]
    features = typer.prompt("Key features (comma-separated, optional)", default="")
    if features:
        p.features = [f.strip() for f in features.split(",") if f.strip()]


# ── interview ─────────────────────────────────────────────────────────


@app.command()
def interview(
    directory: Annotated[Path, typer.Argument(help="Project directory.")] = Path("."),
    config: Annotated[
        Optional[Path], typer.Option("--config", "-c", help="Path to vibemark.yaml.")
    ] = None,
    model: Annotated[
        Optional[str], typer.Option("--model", "-m", help="Claude model to use.")
    ] = None,
) -> None:
    """Guided marketing discovery session — a consultant walks you through key questions."""
    from vibemark.brainstorm import run_interview
    from vibemark.config import find_config, load_config, save_config
    from vibemark.scanner import scan_project

    directory = directory.resolve()
    cfg_path = find_config(directory, config)
    cfg = load_config(cfg_path)
    profile = scan_project(directory)
    cfg.merge_scan(profile)

    cfg = run_interview(cfg, model=model)

    save_config(cfg, cfg_path)
    console.print(f"\n[bold green]Insights saved to {cfg_path}[/bold green]")


# ── brainstorm ────────────────────────────────────────────────────────


@app.command()
def brainstorm(
    topic: Annotated[
        str,
        typer.Argument(
            help="Topic to brainstorm (e.g. 'launch strategy', 'pricing', 'naming', 'positioning')."
        ),
    ] = "marketing strategy",
    directory: Annotated[Path, typer.Option("--dir", "-d", help="Project directory.")] = Path("."),
    config: Annotated[
        Optional[Path], typer.Option("--config", "-c", help="Path to vibemark.yaml.")
    ] = None,
    model: Annotated[
        Optional[str], typer.Option("--model", "-m", help="Claude model to use.")
    ] = None,
) -> None:
    """Open-ended brainstorming session with an AI marketing consultant."""
    from vibemark.brainstorm import run_brainstorm
    from vibemark.config import find_config, load_config
    from vibemark.scanner import scan_project

    directory = directory.resolve()
    cfg_path = find_config(directory, config)
    cfg = load_config(cfg_path)
    profile = scan_project(directory)
    cfg.merge_scan(profile)

    run_brainstorm(cfg, topic, model=model)


# ── generate ──────────────────────────────────────────────────────────


@app.command()
def generate(
    channel: Annotated[
        Optional[Channel], typer.Argument(help="Channel: social, landing, or readme.")
    ] = None,
    all_channels: Annotated[
        bool, typer.Option("--all", help="Generate content for all channels.")
    ] = False,
    config: Annotated[
        Optional[Path], typer.Option("--config", "-c", help="Path to vibemark.yaml.")
    ] = None,
    output: Annotated[
        Optional[Path], typer.Option("--output", "-o", help="Output directory.")
    ] = None,
    model: Annotated[
        Optional[str], typer.Option("--model", "-m", help="Claude model to use.")
    ] = None,
    directory: Annotated[Path, typer.Option("--dir", "-d", help="Project directory.")] = Path("."),
) -> None:
    """Generate marketing content for a channel (social, landing, readme)."""
    from vibemark.config import find_config, load_config
    from vibemark.generator import generate_content
    from vibemark.output import display_content, save_content
    from vibemark.scanner import scan_project

    if not channel and not all_channels:
        console.print("[red]Specify a channel (social, landing, readme) or use --all[/red]")
        raise typer.Exit(1)

    directory = directory.resolve()
    cfg_path = find_config(directory, config)
    cfg = load_config(cfg_path)

    # Re-scan to pick up readme content
    profile = scan_project(directory)
    cfg.merge_scan(profile)

    if not cfg.project.name:
        console.print("[red]No project info found. Run `vibemark init` first.[/red]")
        raise typer.Exit(1)

    channels = list(Channel) if all_channels else [channel]  # type: ignore[list-item]

    for ch in channels:
        console.print(f"\n[bold]Generating [cyan]{ch.value}[/cyan] content...[/bold]")
        try:
            result = generate_content(cfg, ch, model=model)
        except Exception as e:
            console.print(f"[red]Error generating {ch.value}: {e}[/red]")
            continue
        display_content(result)
        save_content(result, output)

"""Rich terminal display and file writing for generated content."""

from __future__ import annotations

from pathlib import Path

from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel

from vibemark.models import GeneratedContent, ProjectProfile

console = Console()

OUTPUT_DIR = "vibemark-output"


def display_profile(profile: ProjectProfile) -> None:
    """Display a scanned project profile as a Rich table."""
    from rich.table import Table

    table = Table(title="Project Profile", show_header=False, title_style="bold cyan")
    table.add_column("Field", style="bold")
    table.add_column("Value")

    table.add_row("Name", profile.name or "(unknown)")
    table.add_row("Description", profile.description or "(none)")
    table.add_row("Language", profile.language or "(unknown)")
    table.add_row("Frameworks", ", ".join(profile.frameworks) if profile.frameworks else "(none)")
    table.add_row("Features", ", ".join(profile.features) if profile.features else "(none)")
    table.add_row("Repo URL", profile.repo_url or "(none)")
    table.add_row("License", profile.license or "(none)")
    table.add_row("README", f"{len(profile.readme_content)} chars" if profile.readme_content else "(not found)")

    console.print(table)


def display_content(result: GeneratedContent) -> None:
    """Display generated content in the terminal."""
    console.print()
    console.print(
        Panel(
            Markdown(result.content),
            title=f"[bold green]{result.channel.value.upper()}[/bold green]",
            subtitle=f"model: {result.model_used} | tokens: {result.prompt_tokens}→{result.output_tokens}",
            border_style="green",
        )
    )


def save_content(result: GeneratedContent, output_dir: Path | None = None) -> Path:
    """Save generated content to a markdown file."""
    out = output_dir or Path(OUTPUT_DIR)
    out.mkdir(parents=True, exist_ok=True)
    filepath = out / f"{result.channel.value}.md"
    filepath.write_text(result.content)
    console.print(f"  [dim]Saved to {filepath}[/dim]")
    return filepath

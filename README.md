# Vibemark

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Built with Claude](https://img.shields.io/badge/built%20with-Claude-blueviolet)](https://claude.ai)

**Your marketing department for vibe-coded projects.**

Vibemark scans your project, coaches you through marketing strategy, generates channel-ready copy, and posts it for you. Built for technical builders who can ship apps but struggle with distribution.

---

## Features

- **Project Scanning** — Automatically reads your README, package.json, pyproject.toml to understand your project. No copy-pasting context.
- **Marketing Consultant** — Guided interview sessions that teach you to think like a marketer: audience, positioning, value prop, origin story.
- **Content Generation** — AI-powered copy for Twitter/X threads, LinkedIn posts, HN/Reddit launches, landing pages, and READMEs.
- **Open-Ended Brainstorming** — Free-form strategy sessions on any marketing topic (launch strategy, pricing, naming, positioning).
- **Channel Automation** — *(coming soon)* Post directly to social channels from the CLI.

---

## Quick Start

```bash
# Install
pip install vibemark

# Scan your project
vibemark scan .

# Run the marketing strategy interview
vibemark interview .

# Generate social media launch content
vibemark generate social

# Generate everything (social, landing page, README)
vibemark generate --all
```

---

## Usage

### Initialize your marketing config

```bash
vibemark init .
```

Scans your project, asks you a few questions about your audience and tone, and saves everything to `vibemark.yaml`. This is your marketing foundation.

### Run a marketing discovery session

```bash
vibemark interview .
```

A guided 6-step session covering:
1. The problem you solve
2. Who it's for
3. What makes you different
4. Your value proposition
5. Your origin story
6. Your marketing goals

The AI consultant explains *why* each question matters, gives feedback, and asks follow-ups. All insights are saved to your config.

### Brainstorm a specific topic

```bash
vibemark brainstorm "launch strategy"
vibemark brainstorm "pricing"
vibemark brainstorm "naming"
```

Open-ended conversation with an AI marketing consultant who knows your project context.

### Generate marketing content

```bash
# Single channel
vibemark generate social
vibemark generate landing
vibemark generate readme

# All channels at once
vibemark generate --all

# Custom output directory
vibemark generate social --output ./marketing

# Use a specific model
vibemark generate social --model claude-sonnet-4-20250514
```

Output is displayed in your terminal and saved to `vibemark-output/`.

---

## Configuration

Vibemark stores your project profile, brand voice, and marketing insights in `vibemark.yaml`:

```yaml
project:
  name: My App
  description: A tool that does something useful
  language: Python
  features:
    - Feature one
    - Feature two

brand:
  tone: casual and authentic
  audience: indie hackers
  tagline: Your catchy tagline here
  keywords:
    - keyword1
    - keyword2

insights:
  problem_statement: The problem your project solves
  value_proposition: Your one-liner value prop
  target_personas:
    - Persona 1
    - Persona 2
  differentiators:
    - What makes you different
  origin_story: How and why you built this
  goals:
    - Your marketing goals
```

Config values take priority over scanned data. The interview and brainstorm commands update this file automatically.

---

## Commands

| Command | Description |
|---|---|
| `vibemark init [DIR]` | Scan project + interactive prompts → create config |
| `vibemark scan [DIR]` | Analyze project files, display profile |
| `vibemark interview [DIR]` | Guided marketing discovery session |
| `vibemark brainstorm [TOPIC]` | Open-ended strategy brainstorm |
| `vibemark generate <channel>` | Generate content (`social`, `landing`, `readme`) |
| `vibemark generate --all` | Generate all channel types |

---

## Contributing

Vibemark is in early development and looking for feedback from fellow builders.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Bug reports, feature requests, and feedback are all welcome via GitHub Issues.

---

## License

MIT

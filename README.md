# VibeMark

AI-powered marketing consultant for solopreneurs with vibecoded apps.

## What it does

VibeMark connects to your GitHub repository, analyzes your project, and acts as a marketing consultant to help you:

- **Discover your story** — articulate what you built and why
- **Identify user personas** — understand who needs your product
- **Craft value propositions** — different messages for different audiences
- **Build a go-to-market strategy** — taglines, elevator pitches, and channel recommendations

## Getting started

### Prerequisites

- Node.js 18+
- A GitHub OAuth App ([create one here](https://github.com/settings/developers))
- An Anthropic API key

### Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in your credentials
cp .env.example .env

# Run the dev server
npm run dev
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `AUTH_SECRET` | NextAuth secret (generate with `openssl rand -base64 32`) |
| `ANTHROPIC_API_KEY` | Anthropic API key for the AI consultant |

Set your GitHub OAuth callback URL to `http://localhost:3000/api/auth/callback/github`.

## Tech stack

- **Next.js 16** with App Router
- **TypeScript**
- **Tailwind CSS v4**
- **NextAuth.js** (GitHub OAuth)
- **Anthropic Claude API** (marketing consultant AI)
- **localStorage** for project persistence

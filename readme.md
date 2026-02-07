# The Wooden Dutch

A satirical logistics and freight news blog powered by Claude via AWS Bedrock and Ghost CMS.

The Wooden Dutch generates Onion-style articles about the freight forwarding, shipping, and supply chain industry — treating absurd premises with total journalistic seriousness.

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) 1.2+
- [Docker](https://docs.docker.com/get-docker/) (for Ghost CMS)
- AWS credentials with Bedrock access

### Setup

```bash
# Install dependencies
bun install

# Copy and configure environment
cp .env.example .env
# Edit .env with your AWS creds and Ghost API key

# Start Ghost CMS
bun run ghost:up
# Visit http://localhost:2368/ghost to complete Ghost setup
# Create an Integration in Ghost Admin → Settings → Integrations
# Copy the Admin API Key to your .env file

# Test Ghost connection
bun run generate -- test-ghost

# Generate your first article (dry run)
bun run generate -- generate --dry-run

# Generate and publish
bun run generate -- generate

# Start the scheduler (Mon/Wed/Fri at 8am Sydney time)
bun run dev
```

## Architecture

```
Topic Generation → Article Writing → Formatting → Ghost Publishing
     (Claude)         (Claude)        (local)       (Ghost API)
```

Each step in the pipeline uses Claude via AWS Bedrock. Topics are tracked to avoid repeats. Articles are formatted as clean HTML and published to Ghost as drafts (or published, if configured).

## Configuration

All config is via environment variables, validated at startup with Zod. See `.env.example` for the full list.

Key settings:
| Variable | Default | Description |
|----------|---------|-------------|
| `BEDROCK_MODEL_ID` | `anthropic.claude-sonnet-4-20250514` | Claude model to use |
| `GHOST_ADMIN_API_KEY` | (required) | `{id}:{secret}` from Ghost |
| `AUTO_PUBLISH` | `false` | Publish immediately or save as draft |
| `CRON_SCHEDULE` | `0 8 * * 1,3,5` | Mon/Wed/Fri at 8am |
| `CRON_TIMEZONE` | `Australia/Sydney` | Timezone for scheduler |

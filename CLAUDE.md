# CLAUDE.md — The Wooden Dutch

## Overview
Satirical logistics news blog. Generates articles using Claude via AWS Bedrock, publishes to a self-hosted Ghost blog.

## Tech Stack
- **Runtime**: Bun + TypeScript (ES Modules)
- **LLM**: Claude via AWS Bedrock (`@aws-sdk/client-bedrock-runtime`)
- **CMS**: Ghost 5 (Docker) with MySQL 8
- **Scheduler**: `croner` — zero-dep, ESM-native
- **CLI**: `commander`
- **Config**: `zod` + `dotenv`
- **Ghost client**: `@tryghost/admin-api`

## Commands

```bash
bun install                          # Install dependencies
bun run typecheck                    # TypeScript check (no emit)
bun run dev                          # Start scheduler (requires .env)
bun run generate -- generate         # Generate + publish one article
bun run generate -- generate --dry-run  # Generate to console only
bun run generate -- test-ghost       # Test Ghost connection
bun run ghost:up                     # Start Ghost + MySQL containers
bun run ghost:down                   # Stop containers
bun run ghost:logs                   # Tail container logs
```

## Project Structure

```
src/
├── index.ts              # Entry: starts cron scheduler
├── cli.ts                # CLI: generate, test-ghost
├── config.ts             # Zod-validated env config
├── types.ts              # Shared interfaces
├── services/
│   ├── bedrock.ts        # AWS Bedrock Claude client
│   ├── ghost.ts          # Ghost Admin API wrapper
│   └── scheduler.ts      # Cron scheduler
├── pipeline/
│   ├── index.ts          # Orchestrator
│   ├── topic-generator.ts
│   ├── article-writer.ts
│   └── formatter.ts
└── prompts/
    ├── system.ts         # Satirical voice definition
    ├── topic.ts          # Topic generation prompt
    └── article.ts        # Article writing prompt
```

## Pipeline Flow
1. **Topic generation** — Claude generates a satirical topic (JSON), tracked in `data/topics-used.json` to avoid repeats
2. **Article writing** — Claude writes 400-700 word HTML article with fake quotes and stats
3. **Formatting** — Strip code fences, generate meta fields
4. **Publishing** — Send to Ghost as draft (or published if `AUTO_PUBLISH=true`)

## Conventions
- ES Modules everywhere — use `import`/`export`
- Bun runtime — no Node-specific APIs unless necessary
- Config validated at startup via Zod
- Bedrock calls have 3-attempt retry with exponential backoff
- Topic history capped at 50 entries

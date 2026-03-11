# Admin Chat Interface — Design Spec

## Overview

A conversational admin interface for The Wooden Dutch that allows editors to brainstorm article ideas with Claude, collaboratively write/refine articles, manage author personas, and publish to Ghost — all through a chat-based UI.

## Architecture

Monolithic Bun server (Hono) within the wooden-dutch project serving an HTMX + SSE frontend. SQLite for persistent state. Ghost Admin API for auth and publishing.

```
┌─────────────────────────────────────────────────┐
│                  Bun Server (Hono)               │
│                                                   │
│  Auth (Ghost Staff) · Chat API (SSE + Claude)    │
│  Author Manager (CRUD via conversation)          │
│                                                   │
│  Context Assembler                                │
│  (recent articles, author roster, topics used,   │
│   Ghost post stats, conversation history)         │
│                                                   │
│  SQLite (convos, authors, sessions)              │
│  Ghost Admin API (posts, images, users)          │
│  Existing LangGraph Pipeline                     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Frontend: HTMX + SSE                           │
│  Chat panel · Conversation sidebar              │
│  Action buttons · Author bar · Pipeline status  │
└─────────────────────────────────────────────────┘
```

## Authentication

Ghost's session API is undocumented and tied to the Ember admin panel — unreliable for third-party auth. Instead, use a simple password gate backed by the existing Ghost Admin API key:

- Admin visits `/admin` → login page with single password field
- Password checked against `ADMIN_PASSWORD` env var (bcrypt-hashed at startup)
- On success: server creates a cookie-based session (stored in SQLite) with a session token
- The admin identity is derived from the Ghost Admin API key's integration — the server calls `GET /ghost/api/admin/users/me/` using the existing JWT auth (from `makeGhostToken`) to confirm the Ghost connection is valid at startup
- Sessions expire after 24 hours (configurable)

This is appropriate for a single-user admin tool. The Ghost Admin API key in `.env` already serves as proof of admin access.

## Chat System

### Data Model

```sql
conversations (id, ghost_user_id, title, created_at, updated_at)
messages (id, conversation_id, role, content, metadata JSON, created_at)
```

### Context Injection

Before each Claude call, the server assembles a system message containing:

- Blog editorial identity (from existing `system.ts` prompt)
- Current author roster (names, voice summaries, recent usage)
- Last 10 published article headlines + dates (from Ghost API)
- Topics already used (from `topics-used.json`)
- Any in-progress draft from the current conversation

Context refreshed at conversation start and after pipeline runs or publishes.

### Claude API for Chat

The chat interface uses the Anthropic SDK (`@anthropic-ai/sdk`) directly — not the LangChain wrapper used by the pipeline. This is a new dependency. Reasons:

- The Anthropic SDK's `client.messages.stream()` provides native streaming, ideal for SSE
- Chat conversations have different needs than the pipeline (variable temperature, tool use for structured actions, no graph orchestration)
- The chat model instance is separate from the pipeline's LangChain model, with its own temperature setting (e.g., 0.7 for chat vs 0.9 for article generation)

Uses the same `ANTHROPIC_API_KEY` from config.

### Streaming

Admin sends message → server calls `anthropic.messages.stream()` with conversation history + context → streams response via SSE → HTMX swaps chunks into chat panel.

### Conversation History Window

To avoid exceeding Claude's context window, conversations are capped at the last 50 messages plus the system context. For longer conversations, older messages are summarized into a single context message.

### Action Detection

Claude proposes, the admin confirms. Claude never directly mutates state.

| Admin says | Claude does | Server action |
|---|---|---|
| "Write an article about blank sailings" | Writes full HTML article | Holds in conversation, shows Publish/Save/Pipeline buttons |
| "Send that through the pipeline" | Confirms topic | Calls `runPipeline()` in background, streams progress |
| "Make Harrison more cynical" | Proposes updated style rules | Shows "Apply changes" button, updates SQLite on confirm |
| "Create a new author — a retired customs officer" | Proposes full persona | Shows "Save author" button, inserts into SQLite on confirm |
| "Show me a sample paragraph from the new author" | Writes sample in persona's voice | Display only |

## Author Management

### Storage

Authors move from hardcoded `authors.ts` to SQLite:

```sql
authors (
  id TEXT PRIMARY KEY,  -- slug-style
  name, title, slug, bio,
  voice_description, style_rules JSON,
  structural_preferences, topic_affinities JSON,
  status TEXT DEFAULT 'active',  -- active|archived
  created_at, updated_at
)
```

### Migration

On first run, the server seeds the database from existing `authors.ts`. The hardcoded file becomes seed-only.

### Pipeline Integration

`assignAuthor` node and prompt templates read from SQLite via `getAuthors()` / `getAuthorById()` replacing current imports.

### CRUD

All author changes happen through chat conversation. Claude proposes, admin confirms via action buttons. No separate forms.

## Two Paths to Publication

### Path 1 — Direct Publish

Admin writes/refines article with Claude in chat → clicks "Publish to Ghost" or "Save as Draft":

```
POST /ghost/api/admin/posts/?source=html
{
  posts: [{
    title, html, status: "draft"|"published",
    tags, authors: [{ slug }],
    feature_image, meta_title, meta_description
  }]
}
```

Article lives only in conversation until admin explicitly acts.

### Path 2 — Pipeline Run

Admin agrees on topic with Claude → clicks "Run Pipeline" → server calls `runPipeline(config, { topicHint, assignedAuthor? })` → runs in background → progress streamed to chat via SSE → final result displayed with Ghost link.

### Pipeline Modifications

- `assignAuthor` reads from SQLite instead of hardcoded array
- `runPipeline` accepts optional `assignedAuthor` in initial state (same pattern as cartoon pipeline, which already sets `initialState.assignedAuthor` directly for Gil Framingham — see `pipeline/index.ts:74`)
- Pipeline streaming uses LangGraph's `.stream()` method instead of `.invoke()`. This yields state updates after each node completes, which the server maps to SSE events: "Researching news...", "Assigning author...", "Writing article...", "Review score: 8/10", etc.
- If the admin closes the browser tab mid-pipeline, the pipeline continues to completion. The result is saved as a local draft (same as `saveOnly` mode). The admin sees it next time they open the interface.

### Direct Publish Bypasses Pipeline Review

When the admin writes an article collaboratively with Claude in chat and publishes directly, the automated editorial review (score/tone/satire checks) does not run. This is intentional — the admin IS the human reviewer in this path. The pipeline path retains full automated review.

### Scheduler Coexistence

Both `bun run dev` (scheduler) and `bun run admin` can run simultaneously. The author migration to SQLite applies globally — the `getAuthors()` / `getAuthorById()` functions used by the pipeline read from SQLite regardless of entry point (scheduler, CLI, or admin). The `authors.ts` file becomes seed data only, used to populate the database on first run.

### Author Schema Mapping

SQLite stores authors with snake_case columns (`voice_description`, `style_rules`, etc.). The `getAuthors()` / `getAuthorById()` query functions return objects conforming to the existing `AuthorPersona` TypeScript interface (camelCase: `voiceDescription`, `styleRules`). This mapping happens in the query layer so no pipeline consumers need to change.

## Frontend

HTMX-powered, server-rendered HTML. No JS build step.

### Layout

- Left sidebar: conversation list
- Center: chat area with message stream, action buttons, input box
- Bottom bar: author roster (clickable for details), pipeline status
- Article previews render actual HTML so admin sees what Ghost will display

### HTMX Mechanics

- SSE connection is established on page load via `hx-ext="sse"` — it stays open for the conversation's lifetime
- Send message: `hx-post="/admin/chat/message"` → server saves user message, returns it rendered as HTML (for immediate display), then begins streaming Claude's response on the already-connected SSE channel
- Action buttons: `hx-post="/admin/chat/action"` with action type → returns status fragment
- Conversation list: `hx-get="/admin/conversations"` → swaps sidebar
- Author details: `hx-get="/admin/authors/{id}"` → popover
- SSE streaming: `hx-ext="sse"` on `/admin/chat/stream/{conversationId}`

### Styling

Minimal CSS, clean monospace-leaning aesthetic matching the newspaper theme. Single stylesheet, no framework.

## File Structure

```
src/
├── admin/
│   ├── server.ts             # Hono app, routes, middleware
│   ├── auth.ts               # Ghost staff auth + session management
│   ├── chat.ts               # Chat routes, Claude calls, SSE streaming
│   ├── actions.ts            # Action handlers (publish, save, author CRUD)
│   ├── context.ts            # Context assembler (Ghost data + local state)
│   ├── db.ts                 # SQLite schema, migrations, queries
│   └── views/
│       ├── layout.ts         # HTML shell
│       ├── login.ts          # Login page
│       ├── chat.ts           # Chat interface
│       └── components.ts     # Message bubbles, action buttons, author cards
├── data/
│   ├── authors.ts            # Seed-only after migration
data/
├── wooden-dutch.db             # SQLite (gitignored, project root data/ dir)
├── pipeline/
│   ├── nodes/assign-author.ts  # Modified: reads from SQLite
│   └── ...
└── ...
```

## Configuration

New env vars:

```
ADMIN_PORT=3000              # Admin server port (default 3000)
ADMIN_PASSWORD=...           # Admin login password
ADMIN_SESSION_SECRET=...     # Cookie signing secret
```

New command:

```bash
bun run admin                # Start the admin server
```

## Decisions

- **Hono** over Express: lighter, TypeScript-native, better Bun compatibility
- **SQLite via `bun:sqlite`**: zero-dependency, persistent, good enough for single-user admin
- **SSE over WebSockets**: simpler, sufficient for one-direction streaming
- **HTMX over SPA framework**: no build step, server-rendered, matches project's lean ethos
- **Own sessions over Ghost pass-through**: avoids CORS issues, keeps server self-contained
- **Claude proposes, admin confirms**: human always in the loop for mutations
- **Anthropic SDK for chat**: separate from pipeline's LangChain, better streaming support
- **Simple password auth**: Ghost session API is undocumented/fragile, password gate is reliable
- **SQLite db in `data/`**: consistent with existing data storage (`topics-used.json`, drafts)

## Error Handling

- Claude API failures during chat: SSE sends an error event, partial response is preserved in the message, admin sees "Something went wrong — try again" with a retry button
- Ghost API failures during publish: error displayed in chat with details, article remains in conversation state for retry
- Pipeline failures: error streamed via SSE, partial results saved as draft if possible

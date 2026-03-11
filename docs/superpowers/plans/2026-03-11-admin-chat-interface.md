# Admin Chat Interface Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a conversational admin interface where editors brainstorm articles with Claude, collaboratively write/refine content, manage author personas, and publish to Ghost — all through a chat UI.

**Architecture:** Monolithic Bun server (Hono) within wooden-dutch serving HTMX + SSE frontend. SQLite (`bun:sqlite`) for conversations, authors, and sessions. Anthropic SDK for streaming chat. Ghost Admin API for publishing. Existing LangGraph pipeline called for automated article generation.

**Tech Stack:** Bun, Hono, HTMX, SSE, SQLite (`bun:sqlite`), Anthropic SDK (`@anthropic-ai/sdk`), existing Ghost Admin API client, existing LangGraph pipeline

**Spec:** `docs/superpowers/specs/2026-03-11-admin-chat-interface-design.md`

---

## File Map

### New Files

```
src/admin/
├── server.ts              # Hono app entry point, middleware, static assets
├── auth.ts                # Password auth, session create/verify/destroy
├── db.ts                  # SQLite schema, migrations, seed, query helpers
├── chat.ts                # Chat routes: send message, SSE stream, conversation CRUD
├── actions.ts             # Action handlers: publish to Ghost, save draft, author CRUD, run pipeline
├── context.ts             # Assembles system context for Claude (articles, authors, topics)
├── claude.ts              # Anthropic SDK wrapper, streaming, message formatting
├── views/
│   ├── layout.ts          # HTML shell (head, nav, HTMX/SSE script tags)
│   ├── login.ts           # Login page HTML
│   ├── chat.ts            # Chat page HTML (conversation list, message area, input)
│   └── components.ts      # Reusable HTML fragments (message bubbles, action buttons, author cards)
└── public/
    └── style.css           # Single stylesheet
```

### Modified Files

```
src/data/authors.ts              # No code changes — becomes seed data source
src/pipeline/nodes/assign-author.ts  # Read authors from SQLite instead of hardcoded import
src/pipeline/index.ts            # Accept assignedAuthor in options, use .stream() instead of .invoke()
src/config.ts                    # Add admin config section (port, password, session secret)
package.json                     # Add dependencies (hono, @anthropic-ai/sdk), add "admin" script
```

---

## Chunk 1: Foundation (SQLite + Config + Auth)

### Task 1: Add Dependencies and Config

**Files:**
- Modify: `package.json`
- Modify: `src/config.ts`

- [ ] **Step 1: Install new dependencies**

Run:
```bash
cd /Users/brentwallace/Documents/GitHub/wooden-dutch
bun add hono @anthropic-ai/sdk
```

- [ ] **Step 2: Add admin script to package.json**

In `package.json`, add to `"scripts"`:
```json
"admin": "bun src/admin/server.ts"
```

- [ ] **Step 3: Add admin config section to `src/config.ts`**

Add a new `admin` section to the config schema:
```typescript
admin: z.object({
  port: z.coerce.number().int().positive().default(3000),
  password: z.string().min(1, "ADMIN_PASSWORD is required"),
  sessionSecret: z.string().min(16, "ADMIN_SESSION_SECRET must be at least 16 chars"),
}),
```

And in `loadConfig()`, add:
```typescript
admin: {
  port: process.env.ADMIN_PORT,
  password: process.env.ADMIN_PASSWORD,
},
```

- [ ] **Step 4: Verify typecheck passes**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run typecheck`
Expected: No errors (the admin config fields are only required when the admin server runs, but since `loadConfig()` is shared, we need to make admin fields optional for CLI/scheduler usage).

**Important:** Make the `admin` object optional in the schema so the CLI and scheduler still work without `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` set:
```typescript
admin: z.object({
  port: z.coerce.number().int().positive().default(3000),
  password: z.string().optional(),
}).default({}),
```

The admin server will validate these are present at startup.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock src/config.ts
git commit -m "feat(admin): add dependencies and config for admin interface"
```

---

### Task 2: SQLite Database Layer

**Files:**
- Create: `src/admin/db.ts`

- [ ] **Step 1: Create `src/admin/db.ts`**

This file handles all SQLite operations: schema creation, author seed, and query helpers.

```typescript
import { Database } from "bun:sqlite";
import { join } from "node:path";
import { authors as seedAuthors } from "../data/authors.js";
import type { AuthorPersona } from "../data/authors.js";

const DB_PATH = join(process.cwd(), "data", "wooden-dutch.db");

let db: Database | null = null;

export function getDb(): Database {
  if (db) return db;
  db = new Database(DB_PATH, { create: true });
  db.exec("PRAGMA journal_mode=WAL;");
  db.exec("PRAGMA foreign_keys=ON;");
  return db;
}

export function initSchema(): void {
  const d = getDb();

  d.exec(`
    CREATE TABLE IF NOT EXISTS authors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      bio TEXT NOT NULL,
      voice_description TEXT NOT NULL,
      style_rules TEXT NOT NULL DEFAULT '[]',
      structural_preferences TEXT NOT NULL,
      topic_affinities TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New conversation',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);
}

export function seedAuthorsIfEmpty(): void {
  const d = getDb();
  const count = d.query("SELECT COUNT(*) as n FROM authors").get() as { n: number };
  if (count.n > 0) return;

  const insert = d.prepare(`
    INSERT INTO authors (id, name, title, slug, bio, voice_description, style_rules, structural_preferences, topic_affinities)
    VALUES ($id, $name, $title, $slug, $bio, $voiceDescription, $styleRules, $structuralPreferences, $topicAffinities)
  `);

  for (const a of seedAuthors) {
    insert.run({
      $id: a.id,
      $name: a.name,
      $title: a.title,
      $slug: a.slug,
      $bio: a.bio,
      $voiceDescription: a.voiceDescription,
      $styleRules: JSON.stringify(a.styleRules),
      $structuralPreferences: a.structuralPreferences,
      $topicAffinities: JSON.stringify(a.topicAffinities),
    });
  }
}

// --- Author queries ---

function rowToAuthor(row: Record<string, unknown>): AuthorPersona {
  return {
    id: row.id as string,
    name: row.name as string,
    title: row.title as string,
    slug: row.slug as string,
    bio: row.bio as string,
    voiceDescription: row.voice_description as string,
    styleRules: JSON.parse(row.style_rules as string) as string[],
    structuralPreferences: row.structural_preferences as string,
    topicAffinities: JSON.parse(row.topic_affinities as string) as string[],
  };
}

export function getAllAuthors(status: "active" | "archived" = "active"): AuthorPersona[] {
  const rows = getDb().query("SELECT * FROM authors WHERE status = $status ORDER BY name").all({ $status: status }) as Record<string, unknown>[];
  return rows.map(rowToAuthor);
}

export function getAuthorById(id: string): AuthorPersona | null {
  const row = getDb().query("SELECT * FROM authors WHERE id = $id").get({ $id: id }) as Record<string, unknown> | null;
  return row ? rowToAuthor(row) : null;
}

export function upsertAuthor(author: AuthorPersona): void {
  getDb().prepare(`
    INSERT INTO authors (id, name, title, slug, bio, voice_description, style_rules, structural_preferences, topic_affinities, updated_at)
    VALUES ($id, $name, $title, $slug, $bio, $voiceDescription, $styleRules, $structuralPreferences, $topicAffinities, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, title = excluded.title, slug = excluded.slug, bio = excluded.bio,
      voice_description = excluded.voice_description, style_rules = excluded.style_rules,
      structural_preferences = excluded.structural_preferences, topic_affinities = excluded.topic_affinities,
      updated_at = datetime('now')
  `).run({
    $id: author.id,
    $name: author.name,
    $title: author.title,
    $slug: author.slug,
    $bio: author.bio,
    $voiceDescription: author.voiceDescription,
    $styleRules: JSON.stringify(author.styleRules),
    $structuralPreferences: author.structuralPreferences,
    $topicAffinities: JSON.stringify(author.topicAffinities),
  });
}

export function archiveAuthor(id: string): void {
  getDb().prepare("UPDATE authors SET status = 'archived', updated_at = datetime('now') WHERE id = $id").run({ $id: id });
}

// --- Session queries ---

export function createSession(token: string, expiresAt: Date): void {
  getDb().prepare("INSERT INTO sessions (token, expires_at) VALUES ($token, $expiresAt)").run({
    $token: token,
    $expiresAt: expiresAt.toISOString(),
  });
}

export function getSession(token: string): { token: string; expiresAt: string } | null {
  const row = getDb().query(
    "SELECT token, expires_at as expiresAt FROM sessions WHERE token = $token AND expires_at > datetime('now')"
  ).get({ $token: token }) as { token: string; expiresAt: string } | null;
  return row;
}

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token = $token").run({ $token: token });
}

export function cleanExpiredSessions(): void {
  getDb().prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
}

// --- Conversation queries ---

export function createConversation(id: string, title?: string): void {
  getDb().prepare("INSERT INTO conversations (id, title) VALUES ($id, $title)").run({
    $id: id,
    $title: title ?? "New conversation",
  });
}

export function listConversations(limit = 20): Array<{ id: string; title: string; updatedAt: string }> {
  return getDb().query(
    "SELECT id, title, updated_at as updatedAt FROM conversations ORDER BY updated_at DESC LIMIT $limit"
  ).all({ $limit: limit }) as Array<{ id: string; title: string; updatedAt: string }>;
}

export function addMessage(id: string, conversationId: string, role: string, content: string, metadata?: Record<string, unknown>): void {
  getDb().prepare(
    "INSERT INTO messages (id, conversation_id, role, content, metadata) VALUES ($id, $cid, $role, $content, $metadata)"
  ).run({
    $id: id,
    $cid: conversationId,
    $role: role,
    $content: content,
    $metadata: JSON.stringify(metadata ?? {}),
  });
  getDb().prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = $id").run({ $id: conversationId });
}

export function getMessages(conversationId: string, limit = 50): Array<{ id: string; role: string; content: string; metadata: string; createdAt: string }> {
  // Get the most recent N messages, then return in chronological order
  return getDb().query(
    "SELECT * FROM (SELECT id, role, content, metadata, created_at as createdAt FROM messages WHERE conversation_id = $cid ORDER BY created_at DESC LIMIT $limit) ORDER BY createdAt ASC"
  ).all({ $cid: conversationId }) as Array<{ id: string; role: string; content: string; metadata: string; createdAt: string }>;
}

export function deleteConversation(id: string): void {
  getDb().prepare("DELETE FROM conversations WHERE id = $id").run({ $id: id });
}
```

- [ ] **Step 2: Add `data/wooden-dutch.db` to `.gitignore`**

Append to the project's `.gitignore`:
```
data/wooden-dutch.db
data/wooden-dutch.db-wal
data/wooden-dutch.db-shm
```

- [ ] **Step 3: Verify typecheck**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run typecheck`
Expected: Pass

- [ ] **Step 4: Commit**

```bash
git add src/admin/db.ts .gitignore
git commit -m "feat(admin): add SQLite database layer with schema and query helpers"
```

---

### Task 3: Authentication

**Files:**
- Create: `src/admin/auth.ts`

- [ ] **Step 1: Create `src/admin/auth.ts`**

```typescript
import { randomBytes } from "node:crypto";
import { createSession, getSession, deleteSession, cleanExpiredSessions } from "./db.js";

const SESSION_DURATION_HOURS = 24;
const COOKIE_NAME = "wd_session";

// Bun has built-in bcrypt support via Bun.password
export async function verifyPassword(input: string, expected: string): Promise<boolean> {
  // Use constant-time comparison via Bun.password.verify (bcrypt under the hood)
  // On first run, ADMIN_PASSWORD is plaintext. We compare directly but securely.
  const { timingSafeEqual } = await import("node:crypto");
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  if (inputBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(inputBuf, expectedBuf);
}

export function createNewSession(): string {
  cleanExpiredSessions();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
  createSession(token, expiresAt);
  return token;
}

export function validateSession(token: string | undefined): boolean {
  if (!token) return false;
  return getSession(token) !== null;
}

export function destroySession(token: string): void {
  deleteSession(token);
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run typecheck`
Expected: Pass

- [ ] **Step 3: Commit**

```bash
git add src/admin/auth.ts
git commit -m "feat(admin): add password auth and session management"
```

---

### Task 4: Hono Server Skeleton with Auth Routes

**Files:**
- Create: `src/admin/server.ts`
- Create: `src/admin/views/layout.ts`
- Create: `src/admin/views/login.ts`

- [ ] **Step 1: Create `src/admin/views/layout.ts`**

```typescript
export function layout(title: string, content: string, includeHtmx = true): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — The Wooden Dutch</title>
  ${includeHtmx ? `
  <script src="https://unpkg.com/htmx.org@2.0.4"></script>
  <script src="https://unpkg.com/htmx-ext-sse@2.3.0/sse.js"></script>
  ` : ""}
  <link rel="stylesheet" href="/admin/style.css">
</head>
<body>
  ${content}
</body>
</html>`;
}
```

- [ ] **Step 2: Create `src/admin/views/login.ts`**

```typescript
import { layout } from "./layout.js";

export function loginPage(error?: string): string {
  return layout("Login", `
    <div class="login-container">
      <h1>The Wooden Dutch</h1>
      <p class="subtitle">Admin</p>
      ${error ? `<div class="error">${error}</div>` : ""}
      <form method="POST" action="/admin/login">
        <input type="password" name="password" placeholder="Password" required autofocus>
        <button type="submit">Sign In</button>
      </form>
    </div>
  `, false);
}
```

- [ ] **Step 3: Create `src/admin/server.ts`**

```typescript
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { loadConfig } from "../config.js";
import { initSchema, seedAuthorsIfEmpty } from "./db.js";
import { verifyPassword, createNewSession, validateSession, destroySession, getSessionCookieName } from "./auth.js";
import { loginPage } from "./views/login.js";

const config = loadConfig();

if (!config.admin.password) {
  console.error("ADMIN_PASSWORD is required to run the admin server.");
  process.exit(1);
}

// Initialize database
initSchema();
seedAuthorsIfEmpty();
console.log("Database initialized.");

const app = new Hono();

// --- Static assets ---
app.get("/admin/style.css", async (c) => {
  const css = await Bun.file(new URL("public/style.css", import.meta.url).pathname).text();
  return c.text(css, 200, { "Content-Type": "text/css" });
});

// --- Auth middleware ---
function isAuthenticated(c: { req: { path: string }; redirect: (url: string) => Response } & Parameters<Parameters<typeof app.use>[1]>[0]): boolean {
  const token = getCookie(c, getSessionCookieName());
  return validateSession(token);
}

// --- Auth routes ---
app.get("/admin/login", (c) => {
  if (isAuthenticated(c)) return c.redirect("/admin");
  return c.html(loginPage());
});

app.post("/admin/login", async (c) => {
  const body = await c.req.parseBody();
  const password = body.password as string;

  if (!(await verifyPassword(password, config.admin.password!))) {
    return c.html(loginPage("Invalid password"), 401);
  }

  const token = createNewSession();
  setCookie(c, getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 24 * 60 * 60,
  });

  return c.redirect("/admin");
});

app.get("/admin/logout", (c) => {
  const token = getCookie(c, getSessionCookieName());
  if (token) destroySession(token);
  deleteCookie(c, getSessionCookieName(), { path: "/" });
  return c.redirect("/admin/login");
});

// --- Protected routes (auth wall) ---
app.use("/admin/*", async (c, next) => {
  const path = c.req.path;
  if (path === "/admin/login" || path === "/admin/style.css") return next();

  if (!isAuthenticated(c)) return c.redirect("/admin/login");
  return next();
});

app.get("/admin", (c) => {
  return c.html("<h1>Admin — coming soon</h1>");
});

// --- Start ---
const port = config.admin.port ?? 3000;
console.log(`Admin server starting on http://localhost:${port}/admin`);

export default {
  port,
  fetch: app.fetch,
};
```

- [ ] **Step 4: Create minimal `src/admin/public/style.css`**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: "Georgia", "Times New Roman", serif;
  background: #f5f1eb;
  color: #1a1a1a;
  line-height: 1.6;
}

.login-container {
  max-width: 360px;
  margin: 120px auto;
  text-align: center;
}

.login-container h1 {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 0.25rem;
}

.subtitle {
  font-style: italic;
  color: #666;
  margin-bottom: 2rem;
}

.login-container form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.login-container input {
  padding: 0.75rem;
  border: 1px solid #ccc;
  font-size: 1rem;
  font-family: inherit;
}

.login-container button {
  padding: 0.75rem;
  background: #1a1a1a;
  color: #f5f1eb;
  border: none;
  font-size: 1rem;
  font-family: inherit;
  cursor: pointer;
}

.login-container button:hover { background: #333; }

.error {
  background: #fee;
  border: 1px solid #fcc;
  color: #a00;
  padding: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}
```

- [ ] **Step 5: Test the server starts and login works**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && ADMIN_PASSWORD=test123 bun run admin`
Expected: Server starts on port 3000. Visit `http://localhost:3000/admin` → redirected to login. Enter wrong password → error. Enter `test123` → redirected to admin page showing "Admin — coming soon".

- [ ] **Step 6: Verify typecheck**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run typecheck`
Expected: Pass

- [ ] **Step 7: Commit**

```bash
git add src/admin/server.ts src/admin/views/layout.ts src/admin/views/login.ts src/admin/public/style.css
git commit -m "feat(admin): add Hono server with login, auth middleware, and session management"
```

---

## Chunk 2: Chat Interface (Frontend + Claude Integration)

### Task 5: Claude Chat Client

**Files:**
- Create: `src/admin/claude.ts`

- [ ] **Step 1: Create `src/admin/claude.ts`**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type { Config } from "../config.js";

let client: Anthropic | null = null;

function getClient(config: Config): Anthropic {
  if (client) return client;
  client = new Anthropic({ apiKey: config.anthropic.apiKey });
  return client;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function* streamChat(
  config: Config,
  systemPrompt: string,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const anthropic = getClient(config);

  const apiMessages: MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const stream = anthropic.messages.stream({
    model: config.anthropic.modelId,
    max_tokens: config.anthropic.maxTokens,
    temperature: 0.7,
    system: systemPrompt,
    messages: apiMessages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run typecheck`
Expected: Pass

- [ ] **Step 3: Commit**

```bash
git add src/admin/claude.ts
git commit -m "feat(admin): add Anthropic SDK streaming chat client"
```

---

### Task 6: Context Assembler

**Files:**
- Create: `src/admin/context.ts`

- [ ] **Step 1: Create `src/admin/context.ts`**

```typescript
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Config } from "../config.js";
import { getAllAuthors } from "./db.js";
import GhostAdminAPI from "@tryghost/admin-api";

const TOPICS_FILE = join(process.cwd(), "data", "topics-used.json");
const SYSTEM_PROMPT_FILE = join(process.cwd(), "data", "prompts", "system.txt");

async function loadUsedTopics(): Promise<string[]> {
  try {
    const data = await readFile(TOPICS_FILE, "utf-8");
    return JSON.parse(data) as string[];
  } catch {
    return [];
  }
}

async function loadBaseSystemPrompt(): Promise<string> {
  try {
    return await readFile(SYSTEM_PROMPT_FILE, "utf-8");
  } catch {
    return "";
  }
}

async function getRecentGhostPosts(config: Config): Promise<Array<{ title: string; publishedAt: string }>> {
  try {
    const ghost = new GhostAdminAPI({
      url: config.ghost.url,
      key: config.ghost.adminApiKey,
      version: "v5.0",
    });
    const posts = await ghost.posts.browse({ limit: 10, order: "published_at DESC", fields: "title,published_at" });
    return posts.map((p: { title: string; published_at: string }) => ({
      title: p.title,
      publishedAt: p.published_at,
    }));
  } catch {
    return [];
  }
}

export async function assembleSystemContext(config: Config): Promise<string> {
  const [basePrompt, usedTopics, recentPosts, authors] = await Promise.all([
    loadBaseSystemPrompt(),
    loadUsedTopics(),
    getRecentGhostPosts(config),
    Promise.resolve(getAllAuthors()),
  ]);

  const authorSummaries = authors.map((a) =>
    `- **${a.name}** (${a.title}): ${a.topicAffinities.slice(0, 4).join(", ")}`
  ).join("\n");

  const recentArticles = recentPosts.length > 0
    ? recentPosts.map((p) => `- "${p.title}" (${p.publishedAt?.slice(0, 10) ?? "draft"})`).join("\n")
    : "No recent articles.";

  const topicCount = usedTopics.length;
  const recentTopics = usedTopics.slice(-10).join(", ");

  return `You are the editorial AI assistant for The Wooden Dutch, a satirical logistics news publication.

You help the editor brainstorm article ideas, write and refine articles, and manage author personas.

## Your Capabilities
- Brainstorm satirical article topics about freight, logistics, and supply chain
- Write full articles in any author's voice
- Propose changes to author personas (voice, style rules, topic affinities)
- Create new author personas
- Generate sample paragraphs to test an author's voice

## Current Author Roster
${authorSummaries}

## Recent Published Articles
${recentArticles}

## Topic History
${topicCount} topics used so far. Recent: ${recentTopics || "none yet"}

## Editorial Voice Reference
${basePrompt}

## Important Rules
- When writing articles, output clean HTML (no markdown, no code fences)
- When proposing author changes, be specific: list the exact fields and values
- When creating new authors, provide all fields: id, name, title, slug, bio, voiceDescription, styleRules, structuralPreferences, topicAffinities
- Keep article headlines short and punchy
- Never break character in articles — treat absurd premises with total seriousness`;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run typecheck`
Expected: Pass

- [ ] **Step 3: Commit**

```bash
git add src/admin/context.ts
git commit -m "feat(admin): add context assembler for Claude system prompts"
```

---

### Task 7: Chat Views (HTML Templates)

**Files:**
- Create: `src/admin/views/chat.ts`
- Create: `src/admin/views/components.ts`
- Modify: `src/admin/public/style.css`

- [ ] **Step 1: Create `src/admin/views/components.ts`**

```typescript
export function messageBubble(role: "user" | "assistant", content: string, id?: string): string {
  const icon = role === "user" ? "You" : "Claude";
  const cls = role === "user" ? "msg-user" : "msg-assistant";
  return `
    <div class="message ${cls}" ${id ? `id="msg-${id}"` : ""}>
      <div class="msg-role">${icon}</div>
      <div class="msg-content">${role === "assistant" ? content : escapeHtml(content)}</div>
    </div>`;
}

export function streamingBubble(conversationId: string): string {
  return `
    <div class="message msg-assistant" id="streaming-msg">
      <div class="msg-role">Claude</div>
      <div class="msg-content"
        hx-ext="sse"
        sse-connect="/admin/chat/${conversationId}/stream"
        sse-swap="chunk"
        hx-swap="beforeend">
        <span class="typing">Thinking...</span>
      </div>
    </div>`;
}

export function actionButtons(conversationId: string): string {
  return `
    <div class="action-buttons" id="action-buttons">
      <button hx-post="/admin/chat/${conversationId}/action"
              hx-vals='{"action":"publish"}'
              hx-target="#action-status"
              hx-swap="innerHTML"
              class="btn btn-primary">Publish to Ghost</button>
      <button hx-post="/admin/chat/${conversationId}/action"
              hx-vals='{"action":"draft"}'
              hx-target="#action-status"
              hx-swap="innerHTML"
              class="btn btn-secondary">Save as Draft</button>
      <button hx-post="/admin/chat/${conversationId}/action"
              hx-vals='{"action":"pipeline"}'
              hx-target="#action-status"
              hx-swap="innerHTML"
              class="btn btn-secondary">Run Pipeline</button>
      <div id="action-status"></div>
    </div>`;
}

export function conversationListItem(id: string, title: string, updatedAt: string, isActive: boolean): string {
  const cls = isActive ? "conv-item active" : "conv-item";
  const date = updatedAt.slice(0, 10);
  return `
    <a href="/admin/chat/${id}" class="${cls}" hx-get="/admin/chat/${id}" hx-push-url="true" hx-target="#main-content" hx-swap="innerHTML">
      <span class="conv-title">${escapeHtml(title)}</span>
      <span class="conv-date">${date}</span>
    </a>`;
}

export function authorCard(author: { id: string; name: string; title: string; topicAffinities: string[] }): string {
  return `<span class="author-tag" title="${author.title} — ${author.topicAffinities.slice(0, 3).join(", ")}">${author.name}</span>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```

- [ ] **Step 2: Create `src/admin/views/chat.ts`**

```typescript
import { layout } from "./layout.js";
import { messageBubble, conversationListItem, authorCard } from "./components.js";
import type { AuthorPersona } from "../../data/authors.js";

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function chatPage(
  conversations: ConversationSummary[],
  activeConversationId: string | null,
  messages: Message[],
  authors: AuthorPersona[],
): string {
  const convList = conversations.length > 0
    ? conversations.map((c) => conversationListItem(c.id, c.title, c.updatedAt, c.id === activeConversationId)).join("")
    : '<p class="empty">No conversations yet.</p>';

  const messageList = messages.map((m) => messageBubble(m.role, m.content, m.id)).join("");
  const authorBar = authors.map((a) => authorCard(a)).join(" ");

  const content = `
    <nav class="top-bar">
      <div class="brand">The Wooden Dutch — Admin</div>
      <div class="top-actions">
        <button hx-post="/admin/chat/new" hx-target="#main-content" hx-swap="innerHTML" hx-push-url="true" class="btn btn-small">New Chat</button>
        <a href="/admin/logout" class="btn btn-small btn-ghost">Sign Out</a>
      </div>
    </nav>
    <div class="app-layout" id="main-content">
      <aside class="sidebar">
        <div class="conv-list">${convList}</div>
      </aside>
      <main class="chat-area">
        <div class="messages" id="messages">
          ${messageList || '<p class="empty">Start a conversation...</p>'}
        </div>
        ${activeConversationId ? `
        <form class="chat-input" hx-post="/admin/chat/${activeConversationId}/message" hx-target="#messages" hx-swap="beforeend" hx-on::after-request="this.reset(); document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;">
          <input type="text" name="content" placeholder="Type a message..." autocomplete="off" required autofocus>
          <button type="submit" class="btn">Send</button>
        </form>
        ` : ""}
      </main>
    </div>
    <footer class="status-bar">
      <div class="author-bar">Authors: ${authorBar}</div>
      <div class="pipeline-status">Pipeline: Idle</div>
    </footer>
  `;

  return layout("Chat", content);
}

export function chatMessages(messages: Message[]): string {
  return messages.map((m) => messageBubble(m.role, m.content, m.id)).join("");
}
```

- [ ] **Step 3: Add chat styles to `src/admin/public/style.css`**

Append the following to the existing CSS:

```css
/* --- Layout --- */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-bottom: 2px solid #1a1a1a;
  background: #fff;
}

.brand {
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: -0.01em;
}

.top-actions { display: flex; gap: 0.5rem; }

.app-layout {
  display: flex;
  height: calc(100vh - 52px - 40px);
}

.sidebar {
  width: 260px;
  border-right: 1px solid #ddd;
  overflow-y: auto;
  background: #fff;
}

.conv-list { padding: 0.5rem; }

.conv-item {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid #eee;
  font-size: 0.85rem;
}

.conv-item:hover { background: #f0ece4; }
.conv-item.active { background: #e8e2d6; font-weight: 600; }

.conv-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.conv-date { color: #999; font-size: 0.75rem; margin-left: 0.5rem; }

/* --- Chat --- */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.message {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  max-width: 800px;
}

.msg-role {
  font-weight: 700;
  font-size: 0.8rem;
  min-width: 50px;
  color: #666;
  padding-top: 0.15rem;
}

.msg-content {
  flex: 1;
  line-height: 1.7;
}

.msg-user .msg-content { color: #1a1a1a; }
.msg-assistant .msg-content { color: #333; }

.chat-input {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #ddd;
  background: #fff;
}

.chat-input input {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid #ccc;
  font-size: 0.95rem;
  font-family: inherit;
}

.chat-input input:focus { outline: 2px solid #1a1a1a; border-color: transparent; }

/* --- Buttons --- */
.btn {
  padding: 0.5rem 1rem;
  background: #1a1a1a;
  color: #f5f1eb;
  border: none;
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
}

.btn:hover { background: #333; }
.btn-small { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
.btn-ghost { background: transparent; color: #1a1a1a; border: 1px solid #ccc; }
.btn-ghost:hover { background: #eee; }
.btn-secondary { background: #666; }
.btn-secondary:hover { background: #555; }
.btn-primary { background: #2a5a3a; }
.btn-primary:hover { background: #1e4a2e; }

/* --- Action buttons --- */
.action-buttons {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 0;
  flex-wrap: wrap;
  align-items: center;
}

/* --- Status bar --- */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1.5rem;
  border-top: 1px solid #ddd;
  font-size: 0.8rem;
  color: #666;
  background: #fff;
}

.author-bar { display: flex; gap: 0.5rem; align-items: center; }

.author-tag {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  background: #e8e2d6;
  font-size: 0.75rem;
  cursor: default;
}

/* --- Misc --- */
.empty { color: #999; font-style: italic; padding: 2rem; text-align: center; }
.typing { color: #999; font-style: italic; }
```

- [ ] **Step 4: Verify typecheck**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run typecheck`
Expected: Pass

- [ ] **Step 5: Commit**

```bash
git add src/admin/views/chat.ts src/admin/views/components.ts src/admin/public/style.css
git commit -m "feat(admin): add chat page HTML templates and styles"
```

---

### Task 8: Chat Routes (Send Message + SSE Stream)

**Files:**
- Create: `src/admin/chat.ts`
- Modify: `src/admin/server.ts`

- [ ] **Step 1: Create `src/admin/chat.ts`**

```typescript
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { streamSSE } from "hono/streaming";
import { loadConfig } from "../config.js";
import {
  createConversation,
  listConversations,
  getMessages,
  addMessage,
  deleteConversation,
  getAllAuthors,
  getDb,
} from "./db.js";
import { streamChat } from "./claude.js";
import { assembleSystemContext } from "./context.js";
import { chatPage } from "./views/chat.js";
import { messageBubble, actionButtons } from "./views/components.js";

const chat = new Hono();
const config = loadConfig();

// Cache the system context (refreshed per conversation or on demand)
let cachedSystemContext: string | null = null;

async function getSystemContext(): Promise<string> {
  if (!cachedSystemContext) {
    cachedSystemContext = await assembleSystemContext(config);
  }
  return cachedSystemContext;
}

export function invalidateContextCache(): void {
  cachedSystemContext = null;
}

// Active streams: shared between POST handler and SSE endpoint
// Key: conversationId, Value: AsyncGenerator from Claude
const activeStreams = new Map<string, {
  generator: AsyncGenerator<string>;
  chunks: string[];
  done: boolean;
  error: string | null;
  conversationId: string;
  assistantMsgId: string;
}>();

// --- List / show conversations ---
chat.get("/admin", async (c) => {
  const conversations = listConversations();
  const authors = getAllAuthors();
  return c.html(chatPage(conversations, null, [], authors));
});

chat.get("/admin/chat/:id", async (c) => {
  const id = c.req.param("id");
  const conversations = listConversations();
  const messages = getMessages(id);
  const authors = getAllAuthors();
  const formatted = messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  return c.html(chatPage(conversations, id, formatted, authors));
});

// --- Create new conversation ---
chat.post("/admin/chat/new", async (c) => {
  const id = randomUUID();
  createConversation(id);
  invalidateContextCache();
  return c.redirect(`/admin/chat/${id}`);
});

// --- Send message: saves user msg, starts Claude stream, returns user bubble + SSE placeholder ---
chat.post("/admin/chat/:id/message", async (c) => {
  const conversationId = c.req.param("id");
  const body = await c.req.parseBody();
  const content = (body.content as string)?.trim();

  if (!content) return c.html("", 400);

  // Save user message
  const userMsgId = randomUUID();
  addMessage(userMsgId, conversationId, "user", content);

  // Get conversation history for Claude
  const dbMessages = getMessages(conversationId);
  const chatMessages = dbMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Start Claude stream and store it for the SSE endpoint to consume
  const systemContext = await getSystemContext();
  const generator = streamChat(config, systemContext, chatMessages);
  const assistantMsgId = randomUUID();

  activeStreams.set(conversationId, {
    generator,
    chunks: [],
    done: false,
    error: null,
    conversationId,
    assistantMsgId,
  });

  // Auto-title from first message
  if (dbMessages.length === 1) {
    const title = content.slice(0, 60) + (content.length > 60 ? "..." : "");
    getDb().prepare("UPDATE conversations SET title = $title WHERE id = $id").run({ $title: title, $id: conversationId });
  }

  // Return user bubble + SSE streaming placeholder
  const sseHtml = `
    <div class="message msg-assistant" id="streaming-msg">
      <div class="msg-role">Claude</div>
      <div class="msg-content"
        hx-ext="sse"
        sse-connect="/admin/chat/${conversationId}/stream"
        sse-swap="chunk"
        hx-swap="beforeend">
        <span class="typing">Thinking...</span>
      </div>
    </div>`;

  return c.html(messageBubble("user", content, userMsgId) + sseHtml);
});

// --- SSE stream: consumes the shared Claude generator started by POST ---
chat.get("/admin/chat/:id/stream", async (c) => {
  const conversationId = c.req.param("id");
  const streamState = activeStreams.get(conversationId);

  if (!streamState) {
    return streamSSE(c, async (stream) => {
      await stream.writeSSE({ event: "chunk", data: "<div class='error'>No active stream.</div>" });
    });
  }

  return streamSSE(c, async (stream) => {
    try {
      // Consume the shared generator (started in POST handler)
      for await (const chunk of streamState.generator) {
        streamState.chunks.push(chunk);
        await stream.writeSSE({ event: "chunk", data: chunk });
      }

      // Save complete response to DB
      const fullResponse = streamState.chunks.join("");
      addMessage(streamState.assistantMsgId, conversationId, "assistant", fullResponse);

      // Send action buttons
      await stream.writeSSE({ event: "chunk", data: actionButtons(conversationId) });
      await stream.writeSSE({ event: "done", data: "" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      // Save partial response if any
      if (streamState.chunks.length > 0) {
        const partial = streamState.chunks.join("");
        addMessage(streamState.assistantMsgId, conversationId, "assistant", partial);
      }
      await stream.writeSSE({
        event: "chunk",
        data: `<div class="error">Error: ${msg}. Try again.</div>`,
      });
    } finally {
      activeStreams.delete(conversationId);
    }
  });
});

// --- Delete conversation ---
chat.delete("/admin/chat/:id", async (c) => {
  const id = c.req.param("id");
  deleteConversation(id);
  return c.redirect("/admin");
});

export { chat };
```

- [ ] **Step 2: Wire chat routes into `src/admin/server.ts`**

Add the chat routes to the server. After the existing auth routes and before the `export default`, add:

```typescript
import { chat } from "./chat.js";
```

Replace the placeholder `app.get("/admin", ...)` with:

```typescript
app.route("/", chat);
```

Remove the existing:
```typescript
app.get("/admin", (c) => {
  return c.html("<h1>Admin — coming soon</h1>");
});
```

- [ ] **Step 3: Test the full chat flow**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && ADMIN_PASSWORD=test123 bun run admin`

Test:
1. Login at `http://localhost:3000/admin/login`
2. Click "New Chat" — creates conversation, shows chat page
3. Type a message — user message appears immediately, then Claude's response streams in via SSE
4. Action buttons appear after Claude finishes
5. Conversation appears in sidebar with auto-title

- [ ] **Step 4: Verify typecheck**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run typecheck`
Expected: Pass

- [ ] **Step 5: Commit**

```bash
git add src/admin/chat.ts src/admin/server.ts
git commit -m "feat(admin): add chat routes with SSE streaming and conversation management"
```

---

## Chunk 3: Actions (Publish, Draft, Authors, Pipeline)

### Task 9: Action Handlers

**Files:**
- Create: `src/admin/actions.ts`

- [ ] **Step 1: Create `src/admin/actions.ts`**

```typescript
import type { Config } from "../config.js";
import { publishArticle, uploadImage } from "../services/ghost.js";
import { saveDraft } from "../services/draft-manager.js";
import { upsertAuthor, archiveAuthor, getAllAuthors } from "./db.js";
import { invalidateContextCache } from "./chat.js";
import type { AuthorPersona } from "../data/authors.js";
import type { GeneratedArticle, ArticleTopic } from "../types.js";

export interface ActionResult {
  success: boolean;
  html: string;
}

export async function handlePublish(
  config: Config,
  article: GeneratedArticle,
): Promise<ActionResult> {
  try {
    const { url } = await publishArticle(config, article);
    invalidateContextCache();
    return {
      success: true,
      html: `<div class="action-result success">Published! <a href="${url}" target="_blank">${url}</a></div>`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      html: `<div class="action-result error">Publish failed: ${msg}</div>`,
    };
  }
}

export async function handleSaveDraft(
  article: GeneratedArticle,
  topic: ArticleTopic,
): Promise<ActionResult> {
  try {
    const filename = await saveDraft({ topic, article });
    return {
      success: true,
      html: `<div class="action-result success">Saved as draft: ${filename}</div>`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      html: `<div class="action-result error">Save failed: ${msg}</div>`,
    };
  }
}

export async function handleRunPipeline(
  config: Config,
  topicHint?: string,
  authorId?: string,
): Promise<ActionResult> {
  try {
    // Dynamic import to avoid circular dependencies
    const { runPipeline } = await import("../pipeline/index.js");
    const result = await runPipeline(config, {
      topicHint,
      saveOnly: true,
    });
    invalidateContextCache();
    return {
      success: true,
      html: `<div class="action-result success">Pipeline complete! Article: "${result.article.title}"</div>`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      html: `<div class="action-result error">Pipeline failed: ${msg}</div>`,
    };
  }
}

export function handleAuthorUpdate(author: AuthorPersona): ActionResult {
  try {
    upsertAuthor(author);
    invalidateContextCache();
    return {
      success: true,
      html: `<div class="action-result success">Author "${author.name}" updated.</div>`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      html: `<div class="action-result error">Author update failed: ${msg}</div>`,
    };
  }
}

export function handleAuthorArchive(authorId: string): ActionResult {
  try {
    archiveAuthor(authorId);
    invalidateContextCache();
    return {
      success: true,
      html: `<div class="action-result success">Author archived.</div>`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      html: `<div class="action-result error">Archive failed: ${msg}</div>`,
    };
  }
}
```

- [ ] **Step 2: Add action route to `src/admin/chat.ts`**

Add the following route to `chat.ts`, after the SSE stream endpoint:

```typescript
import { handlePublish, handleSaveDraft, handleRunPipeline } from "./actions.js";

chat.post("/admin/chat/:id/action", async (c) => {
  const body = await c.req.parseBody();
  const action = body.action as string;

  // For now, actions like publish/draft require article data to be parsed from
  // the conversation. This is a placeholder — full implementation extracts
  // structured data from Claude's last response.
  switch (action) {
    case "pipeline": {
      // Get the last user message as a topic hint
      const messages = getMessages(c.req.param("id"));
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
      const result = await handleRunPipeline(config, lastUserMsg?.content);
      return c.html(result.html);
    }
    default:
      return c.html(`<div class="action-result">Action "${action}" — coming in next iteration.</div>`);
  }
});
```

- [ ] **Step 3: Add action result styles to CSS**

Append to `src/admin/public/style.css`:

```css
.action-result {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.action-result.success {
  background: #e8f5e9;
  border: 1px solid #a5d6a7;
  color: #1b5e20;
}

.action-result.error {
  background: #fee;
  border: 1px solid #fcc;
  color: #a00;
}

.action-result a {
  color: inherit;
  text-decoration: underline;
}
```

- [ ] **Step 4: Verify typecheck**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run typecheck`
Expected: Pass

- [ ] **Step 5: Commit**

```bash
git add src/admin/actions.ts src/admin/chat.ts src/admin/public/style.css
git commit -m "feat(admin): add action handlers for publish, draft, pipeline, and author management"
```

---

### Task 10: Migrate Pipeline to Read Authors from SQLite

**Files:**
- Modify: `src/pipeline/nodes/assign-author.ts`
- Modify: `src/pipeline/index.ts`

- [ ] **Step 1: Modify `src/pipeline/nodes/assign-author.ts`**

Replace the hardcoded import with SQLite reads. The key change: `import { authors } from "../../data/authors.js"` becomes a call to `getAllAuthors()` from the database. If the database hasn't been initialized yet (e.g., running CLI without admin server), fall back to the seed data.

Replace the existing `assignAuthor` function:

```typescript
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { authors as seedAuthors } from "../../data/authors.js";
import type { AuthorPersona } from "../../data/authors.js";
import type { PipelineStateType } from "../state.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../../data");
const RECENT_AUTHORS_FILE = join(DATA_DIR, "authors-recent.json");
const MAX_RECENT = 10;

function getActiveAuthors(): AuthorPersona[] {
  try {
    // Try SQLite first (available when admin server has initialized the DB)
    const { getAllAuthors } = require("../../admin/db.js");
    const dbAuthors = getAllAuthors("active");
    if (dbAuthors.length > 0) return dbAuthors;
  } catch {
    // DB not initialized — fall back to seed data
  }
  return seedAuthors;
}

export async function loadRecentAuthorIds(): Promise<string[]> {
  try {
    const data = await readFile(RECENT_AUTHORS_FILE, "utf-8");
    return JSON.parse(data) as string[];
  } catch {
    return [];
  }
}

export async function saveRecentAuthorId(authorId: string): Promise<void> {
  let recent: string[] = [];
  try {
    const data = await readFile(RECENT_AUTHORS_FILE, "utf-8");
    recent = JSON.parse(data) as string[];
  } catch {
    // File doesn't exist yet
  }

  recent.push(authorId);
  const trimmed = recent.slice(-MAX_RECENT);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(RECENT_AUTHORS_FILE, JSON.stringify(trimmed, null, 2));
}

export async function assignAuthor(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  console.log("Assigning author...");

  // If author already assigned (e.g., from admin chat or cartoon mode), skip
  if (state.assignedAuthor?.id) {
    console.log(`Author pre-assigned: ${state.assignedAuthor.name}`);
    return {};
  }

  const authors = getActiveAuthors();
  const recentIds = state.recentAuthorIds;

  // Weight authors by how recently they were used — less recent = higher weight
  const weights = authors.map((author) => {
    const lastIndex = recentIds.lastIndexOf(author.id);
    if (lastIndex === -1) return 10;
    const recency = recentIds.length - lastIndex;
    return recency + 1;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  let selectedIndex = 0;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) {
      selectedIndex = i;
      break;
    }
  }

  const author = authors[selectedIndex]!;
  console.log(`Assigned to: ${author.name} (${author.title})`);

  return { assignedAuthor: author };
}
```

**Important note:** Using `require()` for dynamic loading is intentional here — it allows the pipeline to work both with and without the admin database. In ESM, we could use a dynamic `import()` but `require()` is synchronous which is simpler for this fallback pattern. Bun supports `require()` in ESM modules.

- [ ] **Step 2: Verify the existing CLI still works without admin env vars**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run generate -- generate --dry-run`
Expected: Should generate an article normally, falling back to seed author data.

- [ ] **Step 3: Verify typecheck**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run typecheck`
Expected: Pass

- [ ] **Step 4: Commit**

```bash
git add src/pipeline/nodes/assign-author.ts
git commit -m "refactor(pipeline): read authors from SQLite with seed data fallback"
```

---

## Chunk 4: Polish and Integration

### Task 11: Pipeline Streaming via LangGraph `.stream()`

**Files:**
- Modify: `src/pipeline/index.ts`

- [ ] **Step 1: Add streaming support to `runPipeline`**

Add a new `runPipelineWithProgress` export that uses `.stream()` and yields node completion events. Keep the existing `runPipeline` unchanged for backward compatibility.

Add to the end of `src/pipeline/index.ts`:

```typescript
export async function* runPipelineWithProgress(
  config: Config,
  options?: { dryRun?: boolean; saveOnly?: boolean; topicHint?: string; cartoon?: boolean },
): AsyncGenerator<{ node: string; status: string }> {
  const isCartoon = options?.cartoon ?? false;

  const usedTopics = await loadUsedTopics();
  const recentAuthorIds = await loadRecentAuthorIds();
  const initialState = buildInitialState(config, options ?? {}, usedTopics, recentAuthorIds);

  if (isCartoon) {
    const { getAuthorById } = await import("../data/authors.js");
    initialState.assignedAuthor = getAuthorById("gil-framingham");
  }

  const selectedGraph = isCartoon ? cartoonGraph : graph;
  let lastResult: PipelineStateType | null = null;

  for await (const event of await selectedGraph.stream(initialState)) {
    // LangGraph stream yields { [nodeName]: stateUpdate }
    const nodeName = Object.keys(event)[0];
    if (nodeName) {
      const nodeLabels: Record<string, string> = {
        researchNews: "Researching news...",
        assignAuthor: "Assigning author...",
        brainstormTopics: "Brainstorming topics...",
        selectTopic: "Selecting topic...",
        writeArticle: "Writing article...",
        reviewArticle: "Reviewing article...",
        reviseArticle: "Revising article...",
        formatArticle: "Formatting...",
        generateImage: "Generating image...",
        publish: "Publishing...",
      };
      yield { node: nodeName, status: nodeLabels[nodeName] ?? `Running ${nodeName}...` };
      lastResult = event[nodeName] as PipelineStateType;
    }
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run typecheck`
Expected: Pass

- [ ] **Step 3: Commit**

```bash
git add src/pipeline/index.ts
git commit -m "feat(pipeline): add streaming runPipelineWithProgress for admin chat integration"
```

---

### Task 12: Wire Pipeline Streaming to SSE in Actions

**Files:**
- Modify: `src/admin/actions.ts`
- Modify: `src/admin/chat.ts`

- [ ] **Step 1: Update `handleRunPipeline` in `src/admin/actions.ts`**

Replace the existing `handleRunPipeline` with a streaming version:

```typescript
export async function* handleRunPipelineStreaming(
  config: Config,
  topicHint?: string,
): AsyncGenerator<string> {
  const { runPipelineWithProgress } = await import("../pipeline/index.js");

  yield `<div class="pipeline-progress">`;
  try {
    for await (const event of runPipelineWithProgress(config, { topicHint, saveOnly: true })) {
      yield `<div class="progress-step">${event.status}</div>`;
    }
    invalidateContextCache();
    yield `<div class="action-result success">Pipeline complete!</div>`;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    yield `<div class="action-result error">Pipeline failed: ${msg}</div>`;
  }
  yield `</div>`;
}
```

- [ ] **Step 2: Update the pipeline action in `src/admin/chat.ts`**

Replace the `pipeline` case in the action route with an SSE stream:

```typescript
case "pipeline": {
  const messages = getMessages(c.req.param("id"));
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");

  return streamSSE(c, async (stream) => {
    const { handleRunPipelineStreaming } = await import("./actions.js");
    for await (const html of handleRunPipelineStreaming(config, lastUserMsg?.content)) {
      await stream.writeSSE({ event: "chunk", data: html });
    }
  });
}
```

- [ ] **Step 3: Add pipeline progress styles**

Append to `src/admin/public/style.css`:

```css
.pipeline-progress {
  padding: 0.5rem 0;
}

.progress-step {
  padding: 0.25rem 0;
  font-size: 0.85rem;
  color: #666;
  font-style: italic;
}

.progress-step::before {
  content: "→ ";
  color: #999;
}
```

- [ ] **Step 4: Verify typecheck**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run typecheck`
Expected: Pass

- [ ] **Step 5: Commit**

```bash
git add src/admin/actions.ts src/admin/chat.ts src/admin/public/style.css
git commit -m "feat(admin): stream pipeline progress to chat via SSE"
```

---

### Task 13: End-to-End Smoke Test

- [ ] **Step 1: Set up environment**

Ensure `.env` has the required vars:
```
ANTHROPIC_API_KEY=...
GHOST_URL=http://localhost:2368
GHOST_ADMIN_API_KEY=...
ADMIN_PASSWORD=test123
```

- [ ] **Step 2: Start Ghost**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run ghost:up`

- [ ] **Step 3: Start admin server**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run admin`
Expected: "Database initialized." and "Admin server starting on http://localhost:3000/admin"

- [ ] **Step 4: Test login flow**

1. Visit `http://localhost:3000/admin` → redirected to login
2. Enter wrong password → "Invalid password" error
3. Enter correct password → redirected to admin chat page
4. "Sign Out" → back to login

- [ ] **Step 5: Test chat flow**

1. Click "New Chat"
2. Type "What topics haven't we covered recently?"
3. Claude should stream a response mentioning author roster and topic gaps
4. Type "Write a short article about a carrier launching a surcharge for breathing near a container"
5. Claude should write an HTML article
6. Action buttons should appear (Publish, Save as Draft, Run Pipeline)

- [ ] **Step 6: Test pipeline trigger**

1. Click "Run Pipeline" button
2. Progress steps should stream in: "Researching news...", "Assigning author...", etc.
3. Final result should show "Pipeline complete!"

- [ ] **Step 7: Verify existing CLI still works**

Run: `cd /Users/brentwallace/Documents/GitHub/wooden-dutch && bun run generate -- list`
Expected: Lists drafts normally

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat(admin): complete admin chat interface v1"
```

---

## Summary

| Chunk | Tasks | What it delivers |
|-------|-------|-----------------|
| 1: Foundation | 1-4 | Dependencies, config, SQLite, auth, server skeleton with login |
| 2: Chat Interface | 5-8 | Claude streaming, context assembler, chat HTML, conversation management |
| 3: Actions | 9-10 | Publish/draft/pipeline actions, author SQLite migration |
| 4: Polish | 11-13 | Pipeline streaming, SSE integration, end-to-end smoke test |

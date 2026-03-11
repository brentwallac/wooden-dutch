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
    `SELECT id, title, updated_at as updatedAt FROM conversations ORDER BY updated_at DESC LIMIT ${Number(limit)}`
  ).all() as Array<{ id: string; title: string; updatedAt: string }>;
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
  return getDb().query(
    `SELECT * FROM (SELECT id, role, content, metadata, created_at as createdAt FROM messages WHERE conversation_id = $cid ORDER BY created_at DESC LIMIT ${Number(limit)}) ORDER BY createdAt ASC`
  ).all({ $cid: conversationId }) as Array<{ id: string; role: string; content: string; metadata: string; createdAt: string }>;
}

export function deleteConversation(id: string): void {
  getDb().prepare("DELETE FROM conversations WHERE id = $id").run({ $id: id });
}

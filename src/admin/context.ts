import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Config } from "../config.js";
import { getAllAuthors } from "./db.js";

const TOPICS_FILE = join(process.cwd(), "data", "topics-used.json");
const SYSTEM_PROMPT_FILE = join(process.cwd(), "data", "prompts", "system.txt");

function makeGhostToken(adminApiKey: string): string {
  const [id, secret] = adminApiKey.split(":");
  if (!secret) throw new Error("Invalid admin API key format");
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" })).toString("base64url");
  const sig = createHmac("sha256", Buffer.from(secret, "hex")).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

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
    const token = makeGhostToken(config.ghost.adminApiKey);
    const res = await fetch(
      `${config.ghost.url}/ghost/api/admin/posts/?limit=10&order=published_at%20DESC&fields=title,published_at`,
      {
        headers: {
          Authorization: `Ghost ${token}`,
          "Accept-Version": "v5.0",
        },
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.posts ?? []).map((p: { title: string; published_at: string }) => ({
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

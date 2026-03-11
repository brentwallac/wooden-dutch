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

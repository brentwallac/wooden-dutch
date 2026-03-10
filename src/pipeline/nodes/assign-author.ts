import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { authors } from "../../data/authors.js";
import type { PipelineStateType } from "../state.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../../data");
const RECENT_AUTHORS_FILE = join(DATA_DIR, "authors-recent.json");
const MAX_RECENT = 10;

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

  const recentIds = state.recentAuthorIds;

  // Weight authors by how recently they were used — less recent = higher weight
  const weights = authors.map((author) => {
    const lastIndex = recentIds.lastIndexOf(author.id);
    if (lastIndex === -1) return 10; // Never used recently — high weight
    const recency = recentIds.length - lastIndex; // Higher = less recent
    return recency + 1;
  });

  // Weighted random selection
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

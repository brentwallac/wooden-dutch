import {
  access,
  mkdir,
  readdir,
  readFile,
  writeFile,
  unlink,
} from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { PipelineResult, DraftArticle } from "../types.js";

const DRAFTS_DIR = join(process.cwd(), "data", "drafts");
const PUBLISHED_DIR = join(DRAFTS_DIR, "published");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function ensureDirs(): Promise<void> {
  await mkdir(DRAFTS_DIR, { recursive: true });
  await mkdir(PUBLISHED_DIR, { recursive: true });
}

export async function saveDraft(
  result: PipelineResult,
  imageBuffer?: Buffer,
): Promise<string> {
  await ensureDirs();

  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(result.article.title);
  const filename = `${date}_${slug}.json`;

  const draft: DraftArticle = {
    id: randomUUID(),
    generatedAt: new Date().toISOString(),
    topic: result.topic,
    article: result.article,
    status: "draft",
    publishedAt: null,
    ghostUrl: null,
  };

  await writeFile(join(DRAFTS_DIR, filename), JSON.stringify(draft, null, 2));

  if (imageBuffer) {
    const imageFilename = `${date}_${slug}.jpg`;
    await writeFile(join(DRAFTS_DIR, imageFilename), imageBuffer);
  }

  return filename;
}

export async function listDrafts(): Promise<
  Array<{ filename: string; draft: DraftArticle }>
> {
  await ensureDirs();

  const files = await readdir(DRAFTS_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();

  const results: Array<{ filename: string; draft: DraftArticle }> = [];
  for (const filename of jsonFiles) {
    const content = await readFile(join(DRAFTS_DIR, filename), "utf-8");
    results.push({ filename, draft: JSON.parse(content) as DraftArticle });
  }

  return results;
}

export async function loadDraft(filename: string): Promise<DraftArticle> {
  const content = await readFile(join(DRAFTS_DIR, filename), "utf-8");
  return JSON.parse(content) as DraftArticle;
}

export async function findDraftFiles(
  pattern: string,
): Promise<Array<{ filename: string; draft: DraftArticle }>> {
  const all = await listDrafts();

  if (pattern === "all") return all;

  return all.filter(
    ({ filename, draft }) =>
      filename === pattern ||
      filename.includes(pattern) ||
      draft.id.startsWith(pattern),
  );
}

export async function loadCompanionImage(
  filename: string,
): Promise<Buffer | null> {
  const imageFilename = filename.replace(/\.json$/, ".jpg");
  const imagePath = join(DRAFTS_DIR, imageFilename);

  try {
    await access(imagePath);
    return await readFile(imagePath);
  } catch {
    return null;
  }
}

export async function markDraftPublished(
  filename: string,
  ghostUrl: string,
): Promise<void> {
  await ensureDirs();

  const filepath = join(DRAFTS_DIR, filename);
  const content = await readFile(filepath, "utf-8");
  const draft = JSON.parse(content) as DraftArticle;

  draft.status = "published";
  draft.publishedAt = new Date().toISOString();
  draft.ghostUrl = ghostUrl;

  await writeFile(join(PUBLISHED_DIR, filename), JSON.stringify(draft, null, 2));
  await unlink(filepath);

  // Clean up companion image if it exists
  const imageFilename = filename.replace(/\.json$/, ".jpg");
  await unlink(join(DRAFTS_DIR, imageFilename)).catch(() => {});
}

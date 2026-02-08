import { z } from "zod";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getModel } from "../../services/langchain-model.js";
import { loadPrompt } from "../../prompts/loader.js";
import { authors, getAuthorById } from "../../data/authors.js";
import type { PipelineStateType } from "../state.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../../data");
const RECENT_AUTHORS_FILE = join(DATA_DIR, "authors-recent.json");
const MAX_RECENT = 10;

const authorIds = authors.map((a) => a.id) as [string, ...string[]];

const assignmentSchema = z.object({
  authorId: z.enum(authorIds).describe("The ID of the selected author"),
  reasoning: z.string().describe("Brief explanation of why this author fits the topic"),
});

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
  const topic = state.selectedTopic;
  console.log("Assigning author...");

  const recentAuthors =
    state.recentAuthorIds.length > 0
      ? state.recentAuthorIds
          .map((id) => {
            const a = authors.find((au) => au.id === id);
            return a ? `- ${a.name} (${a.id})` : `- ${id}`;
          })
          .join("\n")
      : "(none yet)";

  const promptText = loadPrompt("assign-author", {
    headline: topic.headline,
    subheadline: topic.subheadline,
    angle: topic.angle,
    tags: topic.tags.join(", "),
    recentAuthors,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are the editor-in-chief of The Wooden Dutch, a satirical logistics news publication."],
    ["human", "{input}"],
  ]);

  const model = getModel(state.config);
  const structured = model.withStructuredOutput(assignmentSchema, {
    name: "AuthorAssignment",
  });
  const chain = prompt.pipe(structured);

  const result = await chain.invoke({ input: promptText });
  const author = getAuthorById(result.authorId);

  console.log(`Assigned to: ${author.name} (${author.title})`);
  console.log(`Reason: ${result.reasoning}`);

  return { assignedAuthor: author };
}

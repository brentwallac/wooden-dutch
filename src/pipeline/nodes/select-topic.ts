import { z } from "zod";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getModel } from "../../services/langchain-model.js";
import { loadPrompt } from "../../prompts/loader.js";
import type { PipelineStateType } from "../state.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../../data");
const TOPICS_FILE = join(DATA_DIR, "topics-used.json");
const MAX_HISTORY = 50;

const selectionSchema = z.object({
  selectedIndex: z.number().int().min(0).max(2).describe("Index of the selected candidate (0, 1, or 2)"),
  reasoning: z.string().describe("Brief explanation of why this topic was selected"),
});

async function saveUsedTopic(headline: string): Promise<void> {
  let topics: string[] = [];
  try {
    const data = await readFile(TOPICS_FILE, "utf-8");
    topics = JSON.parse(data) as string[];
  } catch {
    // File doesn't exist yet
  }

  topics.push(headline);
  const trimmed = topics.slice(-MAX_HISTORY);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(TOPICS_FILE, JSON.stringify(trimmed, null, 2));
}

export async function selectTopic(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  console.log("Selecting best topic...");

  const candidates = state.topicCandidates
    .map(
      (c, i) =>
        `Candidate ${i + 1}:\n  Headline: ${c.headline}\n  Subheadline: ${c.subheadline}\n  Angle: ${c.angle}\n  Tags: ${c.tags.join(", ")}`,
    )
    .join("\n\n");

  const usedTopics =
    state.usedTopics.length > 0
      ? state.usedTopics.map((t) => `- ${t}`).join("\n")
      : "(none)";

  const promptText = loadPrompt("select-topic", { candidates, usedTopics });
  const systemText = loadPrompt("system", {
    authorName: "the editorial team",
    authorVoice: "You are a seasoned logistics journalism team selecting the most promising satirical topic.",
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemText],
    ["human", "{input}"],
  ]);

  const model = getModel(state.config);
  const structured = model.withStructuredOutput(selectionSchema, {
    name: "TopicSelection",
  });
  const chain = prompt.pipe(structured);

  const result = await chain.invoke({ input: promptText });

  const selected = state.topicCandidates[result.selectedIndex];
  if (!selected) {
    throw new Error(`Invalid selection index: ${result.selectedIndex}`);
  }

  console.log(`Selected: "${selected.headline}"`);
  console.log(`Reason: ${result.reasoning}`);

  await saveUsedTopic(selected.headline);

  return { selectedTopic: selected };
}

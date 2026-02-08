import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config } from "../config.js";
import type { ArticleTopic } from "../types.js";
import { invokeClaude } from "../services/bedrock.js";
import { SYSTEM_PROMPT } from "../prompts/system.js";
import { buildTopicPrompt } from "../prompts/topic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");
const TOPICS_FILE = join(DATA_DIR, "topics-used.json");
const MAX_HISTORY = 50;

async function loadUsedTopics(): Promise<string[]> {
  try {
    const data = await readFile(TOPICS_FILE, "utf-8");
    return JSON.parse(data) as string[];
  } catch {
    return [];
  }
}

async function saveUsedTopic(headline: string): Promise<void> {
  const topics = await loadUsedTopics();
  topics.push(headline);

  // Keep only the last N topics
  const trimmed = topics.slice(-MAX_HISTORY);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(TOPICS_FILE, JSON.stringify(trimmed, null, 2));
}

export async function generateTopic(config: Config): Promise<ArticleTopic> {
  const usedTopics = await loadUsedTopics();
  const prompt = buildTopicPrompt(usedTopics);

  console.log("Generating topic...");
  const response = await invokeClaude(config, SYSTEM_PROMPT, prompt, {
    temperature: 1.0,
    maxTokens: 1024,
  });

  // Strip any accidental code fences
  const cleaned = response.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();

  let topic: ArticleTopic;
  try {
    topic = JSON.parse(cleaned) as ArticleTopic;
  } catch {
    throw new Error(`Failed to parse topic JSON: ${cleaned.slice(0, 200)}`);
  }

  if (!topic.headline || !topic.angle) {
    throw new Error(`Invalid topic structure: missing headline or angle`);
  }

  await saveUsedTopic(topic.headline);
  console.log(`Topic: ${topic.headline}`);

  return topic;
}

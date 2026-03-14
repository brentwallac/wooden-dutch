import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "../config.js";
import type { ChatMessage } from "./claude.js";

let client: Anthropic | null = null;

function getClient(config: Config): Anthropic {
  if (client) return client;
  client = new Anthropic({ apiKey: config.anthropic.apiKey });
  return client;
}

interface ImageContext {
  headline: string;
  angle: string;
  summary: string;
}

const EXTRACTION_PROMPT = `You are a photo editor. Given the conversation below, extract the article's details for a feature image brief.

Return ONLY valid JSON with these fields:
- "headline": the article's headline (string)
- "angle": a 1-sentence description of the article's satirical angle (string)
- "summary": a 1-2 sentence summary of what the article is about (string)

If the conversation doesn't contain a clear article, infer the most likely topic from the discussion.`;

export async function extractImageContext(
  config: Config,
  messages: ChatMessage[],
): Promise<ImageContext> {
  const anthropic = getClient(config);

  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: config.anthropic.modelId,
    max_tokens: 512,
    temperature: 0,
    system: EXTRACTION_PROMPT,
    messages: [{ role: "user", content: conversationText }],
  });

  const firstBlock = response.content[0];
  const text = firstBlock?.type === "text" ? firstBlock.text : "";

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  const parsed = JSON.parse(cleaned) as ImageContext;
  return parsed;
}

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

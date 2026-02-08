import { ChatAnthropic } from "@langchain/anthropic";
import type { Config } from "../config.js";

let model: ChatAnthropic | null = null;

export function getModel(config: Config): ChatAnthropic {
  if (model) return model;

  model = new ChatAnthropic({
    model: config.anthropic.modelId,
    apiKey: config.anthropic.apiKey,
    maxTokens: config.anthropic.maxTokens,
    temperature: 0.9,
  });

  return model;
}

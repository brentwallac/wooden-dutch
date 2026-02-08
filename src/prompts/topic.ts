import { loadPrompt } from "./loader.js";

export function buildTopicPrompt(usedTopics: string[]): string {
  const avoidList =
    usedTopics.length > 0
      ? `\n\nAvoid these previously used headlines:\n${usedTopics.map((t) => `- ${t}`).join("\n")}`
      : "";

  return loadPrompt("topic", { avoidList });
}

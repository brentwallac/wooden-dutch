import type { Config } from "../config.js";
import type { ArticleTopic } from "../types.js";
import { invokeClaude } from "../services/bedrock.js";
import { SYSTEM_PROMPT } from "../prompts/system.js";
import { buildArticlePrompt } from "../prompts/article.js";

export async function writeArticle(
  config: Config,
  topic: ArticleTopic,
): Promise<string> {
  const prompt = buildArticlePrompt(topic);

  console.log("Writing article...");
  const html = await invokeClaude(config, SYSTEM_PROMPT, prompt);

  if (!html.includes("<p>")) {
    throw new Error("Article response does not appear to contain HTML");
  }

  return html;
}

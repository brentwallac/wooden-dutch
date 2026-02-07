import type { Config } from "../config.js";
import type { PipelineResult } from "../types.js";
import { generateTopic } from "./topic-generator.js";
import { writeArticle } from "./article-writer.js";
import { formatArticle } from "./formatter.js";
import { publishArticle } from "../services/ghost.js";

export async function runPipeline(
  config: Config,
  options?: { dryRun?: boolean },
): Promise<PipelineResult> {
  console.log("\n--- Pipeline Start ---\n");

  // Step 1: Generate topic
  const topic = await generateTopic(config);

  // Step 2: Write article
  const rawHtml = await writeArticle(config, topic);

  // Step 3: Format for Ghost
  const article = formatArticle(topic, rawHtml);
  console.log(`Formatted: "${article.title}" (${article.html.length} chars)`);

  // Step 4: Publish (or dry run)
  if (options?.dryRun) {
    console.log("\n--- DRY RUN — Article not published ---\n");
    console.log(`Title: ${article.title}`);
    console.log(`Tags: ${article.tags.join(", ")}`);
    console.log(`Meta: ${article.metaDescription}`);
    console.log("\n--- HTML Preview ---\n");
    console.log(article.html);
    return { topic, article };
  }

  console.log("Publishing to Ghost...");
  const { url } = await publishArticle(config, article);
  console.log(`Published: ${url}`);

  console.log("\n--- Pipeline Complete ---\n");

  return {
    topic,
    article,
    ghostUrl: url,
    publishedAt: new Date().toISOString(),
  };
}

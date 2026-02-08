import { publishArticle } from "../../services/ghost.js";
import { saveDraft } from "../../services/draft-manager.js";
import { saveRecentAuthorId } from "./assign-author.js";
import type { PipelineStateType } from "../state.js";

export async function publish(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  const article = state.article;

  if (state.options.saveOnly) {
    const filename = await saveDraft(
      { topic: state.selectedTopic, article },
    );
    console.log(`Saved draft: data/drafts/${filename}`);
    return {};
  }

  if (state.options.dryRun) {
    console.log("\n--- DRY RUN — Article not published ---\n");
    console.log(`Title: ${article.title}`);
    console.log(`Author: ${article.authorName}`);
    console.log(`Tags: ${article.tags.join(", ")}`);
    console.log(`Meta: ${article.metaDescription}`);
    console.log("\n--- HTML Preview ---\n");
    console.log(article.html);
    return {};
  }

  if (state.imageUrl && state.imageUrl !== "dry-run") {
    article.featureImageUrl = state.imageUrl;
  }

  console.log("Publishing to Ghost...");
  const { url } = await publishArticle(state.config, article);
  console.log(`Published: ${url}`);

  await saveRecentAuthorId(state.assignedAuthor.id);

  return {};
}

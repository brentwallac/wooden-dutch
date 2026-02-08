import { formatArticle as formatArticleCore } from "../formatter.js";
import type { PipelineStateType } from "../state.js";

export async function formatArticle(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  const article = formatArticleCore(state.selectedTopic, state.articleHtml, state.assignedAuthor);
  console.log(`Formatted: "${article.title}" by ${article.authorName} (${article.html.length} chars)`);
  return { article };
}

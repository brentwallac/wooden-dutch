import type { ArticleTopic, GeneratedArticle } from "../types.js";
import type { AuthorPersona } from "../data/authors.js";

export function formatArticle(
  topic: ArticleTopic,
  rawHtml: string,
  author: AuthorPersona,
): GeneratedArticle {
  // Strip code fences if the LLM wrapped its output
  let html = rawHtml
    .replace(/^```html?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  // Ensure it starts with an HTML tag
  const firstTag = html.indexOf("<");
  if (firstTag > 0) {
    html = html.slice(firstTag);
  }

  // Generate meta description from the subheadline or angle
  const metaDescription = topic.subheadline || topic.angle.slice(0, 155);

  return {
    title: topic.headline,
    html,
    metaTitle: topic.headline,
    metaDescription,
    tags: topic.tags,
    authorName: author.name,
    authorSlug: author.slug,
  };
}

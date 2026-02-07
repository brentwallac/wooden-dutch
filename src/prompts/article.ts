import type { ArticleTopic } from "../types.js";

export function buildArticlePrompt(topic: ArticleTopic): string {
  return `Write a satirical news article for The Wooden Dutch based on this topic:

**Headline:** ${topic.headline}
**Subheadline:** ${topic.subheadline}
**Angle:** ${topic.angle}

Requirements:
- 400-700 words
- Open with a dateline (e.g., "ROTTERDAM — " or "SINGAPORE — ") using a relevant logistics hub
- Include 2-3 fake but plausible quotes from fictional industry figures (with name, title, and company)
- Include 1-2 fake but believable statistics
- End with a kicker — a final line or paragraph that lands the joke
- Use real logistics terminology naturally throughout
- Write in clean HTML using only these tags: <p>, <h2>, <h3>, <blockquote>, <em>, <strong>
- Do NOT include the headline in the article body — Ghost handles that separately
- Do NOT wrap in code fences or any outer container
- Output raw HTML only, starting directly with the first <p> tag`;
}

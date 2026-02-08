import type { ArticleTopic } from "../types.js";
import { loadPrompt } from "./loader.js";

export function buildImagePrompt(topic: ArticleTopic, summary: string): string {
  return loadPrompt("image", {
    headline: topic.headline,
    angle: topic.angle,
    summary,
  });
}

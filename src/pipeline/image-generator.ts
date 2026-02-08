import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Config } from "../config.js";
import type { ArticleTopic } from "../types.js";
import { buildImagePrompt } from "../prompts/image.js";
import { generateImage } from "../services/gemini.js";
import { uploadImage } from "../services/ghost.js";

const IMAGES_DIR = join(process.cwd(), "data", "drafts", "images");

export interface ImageResult {
  url: string;
  imageBuffer?: Buffer;
}

export async function generateFeatureImage(
  config: Config,
  topic: ArticleTopic,
  summary: string,
  options?: { dryRun?: boolean; saveOnly?: boolean; slug?: string },
): Promise<ImageResult | null> {
  if (!config.gemini.apiKey) return null;

  const prompt = buildImagePrompt(topic, summary);
  const imageBuffer = await generateImage(config, prompt);
  if (!imageBuffer) return null;

  // Dry run — just report that an image was generated
  if (options?.dryRun) {
    console.log(`Feature image generated (${imageBuffer.length} bytes, not uploaded in dry-run)`);
    return { url: "dry-run", imageBuffer };
  }

  // Save-only mode — write image to disk alongside draft
  if (options?.saveOnly) {
    await mkdir(IMAGES_DIR, { recursive: true });
    const filename = `${options.slug ?? "image"}.jpg`;
    const filepath = join(IMAGES_DIR, filename);
    await writeFile(filepath, imageBuffer);
    console.log(`Feature image saved: data/drafts/images/${filename}`);
    return { url: filepath, imageBuffer };
  }

  // Publish mode — upload to Ghost
  const { url } = await uploadImage(config, imageBuffer, "feature-image.jpg");
  return { url };
}

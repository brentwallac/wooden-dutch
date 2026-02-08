import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildImagePrompt } from "../../prompts/image.js";
import { generateImage } from "../../services/gemini.js";
import { uploadImage } from "../../services/ghost.js";
import type { PipelineStateType } from "../state.js";

const IMAGES_DIR = join(process.cwd(), "data", "drafts", "images");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function generateImageNode(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  if (!state.config.gemini.apiKey) {
    return { imageUrl: null };
  }

  const topic = state.selectedTopic;
  const summary = state.article.metaDescription;
  const prompt = buildImagePrompt(topic, summary);
  const imageBuffer = await generateImage(state.config, prompt);

  if (!imageBuffer) {
    return { imageUrl: null };
  }

  if (state.options.dryRun) {
    console.log(`Feature image generated (${imageBuffer.length} bytes, not uploaded in dry-run)`);
    return { imageUrl: "dry-run" };
  }

  if (state.options.saveOnly) {
    await mkdir(IMAGES_DIR, { recursive: true });
    const slug = slugify(state.article.title);
    const filename = `${slug}.jpg`;
    const filepath = join(IMAGES_DIR, filename);
    await writeFile(filepath, imageBuffer);
    console.log(`Feature image saved: data/drafts/images/${filename}`);
    return { imageUrl: filepath };
  }

  const { url } = await uploadImage(state.config, imageBuffer, "feature-image.jpg");
  return { imageUrl: url };
}

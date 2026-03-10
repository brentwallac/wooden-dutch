import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadPrompt } from "../../prompts/loader.js";
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

export async function generateCartoonImage(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  if (!state.config.gemini.apiKey) {
    console.warn("No Gemini API key — cannot generate cartoon image");
    return { imageUrl: null };
  }

  const topic = state.selectedTopic;
  // topic.angle contains the scene description, topic.subheadline contains the caption
  const prompt = loadPrompt("cartoon-image", {
    scene: topic.angle,
    caption: topic.subheadline,
  });

  console.log("Generating cartoon image via Gemini...");
  const imageBuffer = await generateImage(state.config, prompt);

  if (!imageBuffer) {
    return { imageUrl: null };
  }

  if (state.options.dryRun) {
    await mkdir(IMAGES_DIR, { recursive: true });
    const slug = slugify(topic.headline);
    const filename = `cartoon-${slug}.jpg`;
    const filepath = join(IMAGES_DIR, filename);
    await writeFile(filepath, imageBuffer);
    console.log(`Cartoon image saved: data/drafts/images/${filename} (${imageBuffer.length} bytes)`);
    return { imageUrl: filepath };
  }

  if (state.options.saveOnly) {
    await mkdir(IMAGES_DIR, { recursive: true });
    const slug = slugify(topic.headline);
    const filename = `cartoon-${slug}.jpg`;
    const filepath = join(IMAGES_DIR, filename);
    await writeFile(filepath, imageBuffer);
    console.log(`Cartoon image saved: data/drafts/images/${filename}`);
    return { imageUrl: filepath };
  }

  const { url } = await uploadImage(state.config, imageBuffer, "cartoon.jpg");
  return { imageUrl: url };
}

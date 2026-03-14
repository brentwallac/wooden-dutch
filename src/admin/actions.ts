import type { Config } from "../config.js";
import { publishArticle } from "../services/ghost.js";
import { saveDraft } from "../services/draft-manager.js";
import { upsertAuthor, archiveAuthor } from "./db.js";
import { invalidateContextCache } from "./chat.js";
import { extractImageContext } from "./image-extract.js";
import type { AuthorPersona } from "../data/authors.js";
import type { GeneratedArticle, ArticleTopic } from "../types.js";
import type { ChatMessage } from "./claude.js";

export interface ActionResult {
  success: boolean;
  html: string;
}

export async function handlePublish(
  config: Config,
  article: GeneratedArticle,
): Promise<ActionResult> {
  try {
    const { url } = await publishArticle(config, article);
    invalidateContextCache();
    return {
      success: true,
      html: `<div class="action-result success">Published! <a href="${url}" target="_blank">${url}</a></div>`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      html: `<div class="action-result error">Publish failed: ${msg}</div>`,
    };
  }
}

export async function handleSaveDraft(
  article: GeneratedArticle,
  topic: ArticleTopic,
): Promise<ActionResult> {
  try {
    const filename = await saveDraft({ topic, article });
    return {
      success: true,
      html: `<div class="action-result success">Saved as draft: ${filename}</div>`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      html: `<div class="action-result error">Save failed: ${msg}</div>`,
    };
  }
}

export async function handleRunPipeline(
  config: Config,
  topicHint?: string,
): Promise<ActionResult> {
  try {
    // Dynamic import to avoid circular dependencies
    const { runPipeline } = await import("../pipeline/index.js");
    const result = await runPipeline(config, {
      topicHint,
      saveOnly: true,
    });
    invalidateContextCache();
    return {
      success: true,
      html: `<div class="action-result success">Pipeline complete! Article: "${result.article.title}"</div>`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      html: `<div class="action-result error">Pipeline failed: ${msg}</div>`,
    };
  }
}

export async function* handleRunPipelineStreaming(
  config: Config,
  topicHint?: string,
  saveOnly = true,
): AsyncGenerator<string> {
  const { runPipelineWithProgress } = await import("../pipeline/index.js");
  const { basename } = await import("node:path");

  yield `<div class="pipeline-progress">`;
  try {
    let imageFilename: string | null = null;
    let publishedUrl: string | null = null;

    for await (const event of runPipelineWithProgress(config, { topicHint, saveOnly })) {
      yield `<div class="progress-step">${event.status}</div>`;

      // Capture image path from the generateImage node
      if (event.node === "generateImage" && event.state?.imageUrl) {
        const imageUrl = event.state.imageUrl as string;
        if (imageUrl !== "dry-run" && !imageUrl.startsWith("http")) {
          imageFilename = basename(imageUrl);
        }
      }

      // Capture published URL from the publish node
      if (event.node === "publish" && event.state?.publishedUrl) {
        publishedUrl = event.state.publishedUrl as string;
      }
    }

    invalidateContextCache();

    if (imageFilename) {
      yield `<div class="pipeline-image"><img src="/admin/images/${imageFilename}" alt="Generated feature image"></div>`;
    }

    if (publishedUrl) {
      yield `<div class="action-result success">Published! <a href="${publishedUrl}" target="_blank">${publishedUrl}</a></div>`;
    } else if (!saveOnly) {
      yield `<div class="action-result success">Published to Ghost!</div>`;
    } else {
      yield `<div class="action-result success">Pipeline complete! Draft saved locally.</div>`;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    yield `<div class="action-result error">Pipeline failed: ${msg}</div>`;
  }
  yield `</div>`;
}

export function handleAuthorUpdate(author: AuthorPersona): ActionResult {
  try {
    upsertAuthor(author);
    invalidateContextCache();
    return {
      success: true,
      html: `<div class="action-result success">Author "${author.name}" updated.</div>`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      html: `<div class="action-result error">Author update failed: ${msg}</div>`,
    };
  }
}

export function handleAuthorArchive(authorId: string): ActionResult {
  try {
    archiveAuthor(authorId);
    invalidateContextCache();
    return {
      success: true,
      html: `<div class="action-result success">Author archived.</div>`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      html: `<div class="action-result error">Archive failed: ${msg}</div>`,
    };
  }
}

export async function* handleGenerateImageStreaming(
  config: Config,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  yield `<div class="pipeline-progress">`;

  try {
    // Step 1: Extract context from conversation
    yield `<div class="progress-step">Extracting article context...</div>`;
    const context = await extractImageContext(config, messages);
    yield `<div class="progress-step">Topic: "${context.headline}"</div>`;

    // Step 2: Build prompt and generate image
    yield `<div class="progress-step">Generating image via Gemini...</div>`;
    const { buildImagePrompt } = await import("../prompts/image.js");
    const { generateImage } = await import("../services/gemini.js");

    const prompt = buildImagePrompt(
      { headline: context.headline, subheadline: "", angle: context.angle, tags: [] },
      context.summary,
    );
    const imageBuffer = await generateImage(config, prompt);

    if (!imageBuffer) {
      yield `<div class="action-result error">Image generation failed — Gemini returned no image. Check GEMINI_API_KEY is set.</div>`;
      yield `</div>`;
      return;
    }

    // Step 3: Save locally
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");

    const imagesDir = join(process.cwd(), "data", "drafts", "images");
    await mkdir(imagesDir, { recursive: true });

    const slug = context.headline
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const filename = `${slug}.jpg`;
    const filepath = join(imagesDir, filename);
    await writeFile(filepath, imageBuffer);

    yield `<div class="progress-step">Saved: data/drafts/images/${filename}</div>`;

    // Step 4: Show the image
    yield `<div class="pipeline-image"><img src="/admin/images/${filename}" alt="Generated feature image"></div>`;

    yield `<div class="action-result success">Image generated and saved locally.</div>`;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    yield `<div class="action-result error">Image generation failed: ${msg}</div>`;
  }

  yield `</div>`;
}

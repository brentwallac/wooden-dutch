import type { Config } from "../config.js";
import { publishArticle } from "../services/ghost.js";
import { saveDraft } from "../services/draft-manager.js";
import { upsertAuthor, archiveAuthor } from "./db.js";
import { invalidateContextCache } from "./chat.js";
import type { AuthorPersona } from "../data/authors.js";
import type { GeneratedArticle, ArticleTopic } from "../types.js";

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
): AsyncGenerator<string> {
  const { runPipelineWithProgress } = await import("../pipeline/index.js");

  yield `<div class="pipeline-progress">`;
  try {
    for await (const event of runPipelineWithProgress(config, { topicHint, saveOnly: true })) {
      yield `<div class="progress-step">${event.status}</div>`;
    }
    invalidateContextCache();
    yield `<div class="action-result success">Pipeline complete!</div>`;
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

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config } from "../config.js";
import type { PipelineResult } from "../types.js";
import { graph } from "./graph.js";
import { loadRecentAuthorIds } from "./nodes/assign-author.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOPICS_FILE = join(__dirname, "../../data/topics-used.json");

async function loadUsedTopics(): Promise<string[]> {
  try {
    const data = await readFile(TOPICS_FILE, "utf-8");
    return JSON.parse(data) as string[];
  } catch {
    return [];
  }
}

export async function runPipeline(
  config: Config,
  options?: { dryRun?: boolean; saveOnly?: boolean; topicHint?: string },
): Promise<PipelineResult> {
  console.log("\n--- Pipeline Start ---\n");

  const usedTopics = await loadUsedTopics();
  const recentAuthorIds = await loadRecentAuthorIds();

  const result = await graph.invoke({
    config,
    options: options ?? {},
    usedTopics,
    recentAuthorIds,
    revisionCount: 0,
    topicCandidates: [],
    selectedTopic: { headline: "", subheadline: "", angle: "", tags: [] },
    assignedAuthor: {
      id: "", name: "", title: "", slug: "", bio: "",
      voiceDescription: "", styleRules: [], structuralPreferences: "",
      topicAffinities: [],
    },
    articleHtml: "",
    review: {
      score: 0,
      toneCorrect: false,
      wordCountOk: false,
      satireQuality: "weak" as const,
      htmlValid: false,
      feedback: "",
    },
    article: {
      title: "", html: "", metaTitle: "", metaDescription: "",
      tags: [], authorName: "", authorSlug: "",
    },
    imageUrl: null,
    industryHeadlines: [],
  });

  console.log("\n--- Pipeline Complete ---\n");

  return {
    topic: result.selectedTopic,
    article: result.article,
  };
}

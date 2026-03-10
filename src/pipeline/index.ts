import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config } from "../config.js";
import type { PipelineResult } from "../types.js";
import { graph } from "./graph.js";
import { cartoonGraph } from "./cartoon-graph.js";
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

function buildInitialState(
  config: Config,
  options: { dryRun?: boolean; saveOnly?: boolean; topicHint?: string },
  usedTopics: string[],
  recentAuthorIds: string[],
) {
  return {
    config,
    options,
    usedTopics,
    recentAuthorIds,
    revisionCount: 0,
    topicCandidates: [],
    selectedTopic: { headline: "", subheadline: "", angle: "", tags: [] },
    assignedAuthor: {
      id: "", name: "", title: "", slug: "", bio: "",
      voiceDescription: "", styleRules: [] as string[], structuralPreferences: "",
      topicAffinities: [] as string[],
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
  };
}

export async function runPipeline(
  config: Config,
  options?: { dryRun?: boolean; saveOnly?: boolean; topicHint?: string; cartoon?: boolean },
): Promise<PipelineResult> {
  const isCartoon = options?.cartoon ?? false;
  console.log(`\n--- ${isCartoon ? "Cartoon" : "Article"} Pipeline Start ---\n`);

  const usedTopics = await loadUsedTopics();
  const recentAuthorIds = await loadRecentAuthorIds();

  const initialState = buildInitialState(config, options ?? {}, usedTopics, recentAuthorIds);

  // For cartoons, force Gil Framingham as the author
  if (isCartoon) {
    const { getAuthorById } = await import("../data/authors.js");
    initialState.assignedAuthor = getAuthorById("gil-framingham");
  }

  const selectedGraph = isCartoon ? cartoonGraph : graph;
  const result = await selectedGraph.invoke(initialState);

  console.log(`\n--- ${isCartoon ? "Cartoon" : "Article"} Pipeline Complete ---\n`);

  return {
    topic: result.selectedTopic,
    article: result.article,
  };
}

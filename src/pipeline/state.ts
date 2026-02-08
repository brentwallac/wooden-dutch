import { Annotation } from "@langchain/langgraph";
import type { Config } from "../config.js";
import type { ArticleTopic, GeneratedArticle, EditorialReview } from "../types.js";
import type { AuthorPersona } from "../data/authors.js";

const PipelineState = Annotation.Root({
  config: Annotation<Config>,
  options: Annotation<{ dryRun?: boolean; saveOnly?: boolean }>,
  usedTopics: Annotation<string[]>,
  topicCandidates: Annotation<ArticleTopic[]>,
  selectedTopic: Annotation<ArticleTopic>,
  assignedAuthor: Annotation<AuthorPersona>,
  recentAuthorIds: Annotation<string[]>,
  articleHtml: Annotation<string>,
  review: Annotation<EditorialReview>,
  revisionCount: Annotation<number>,
  article: Annotation<GeneratedArticle>,
  imageUrl: Annotation<string | null>,
  industryHeadlines: Annotation<string[]>,
});

export type PipelineStateType = typeof PipelineState.State;
export { PipelineState };

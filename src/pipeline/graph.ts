import { StateGraph, START, END } from "@langchain/langgraph";
import { PipelineState, type PipelineStateType } from "./state.js";
import { brainstormTopics } from "./nodes/brainstorm.js";
import { selectTopic } from "./nodes/select-topic.js";
import { assignAuthor } from "./nodes/assign-author.js";
import { writeArticle } from "./nodes/write-article.js";
import { reviewArticle } from "./nodes/review-article.js";
import { reviseArticle } from "./nodes/revise-article.js";
import { formatArticle } from "./nodes/format.js";
import { generateImageNode } from "./nodes/generate-image.js";
import { publish } from "./nodes/publish.js";
import { researchNews } from "./nodes/research-news.js";

function shouldRevise(state: PipelineStateType): "formatArticle" | "reviseArticle" {
  if (state.review.score >= 7 || state.revisionCount >= 2) {
    console.log(
      state.review.score >= 7
        ? `Article approved (score: ${state.review.score}/10)`
        : `Max revisions reached (${state.revisionCount}), proceeding with current version`,
    );
    return "formatArticle";
  }
  console.log(`Article needs revision (score: ${state.review.score}/10)`);
  return "reviseArticle";
}

const workflow = new StateGraph(PipelineState)
  .addNode("researchNews", researchNews)
  .addNode("brainstormTopics", brainstormTopics)
  .addNode("selectTopic", selectTopic)
  .addNode("assignAuthor", assignAuthor)
  .addNode("writeArticle", writeArticle)
  .addNode("reviewArticle", reviewArticle)
  .addNode("reviseArticle", reviseArticle)
  .addNode("formatArticle", formatArticle)
  .addNode("generateImage", generateImageNode)
  .addNode("publish", publish)
  .addEdge(START, "researchNews")
  .addEdge("researchNews", "brainstormTopics")
  .addEdge("brainstormTopics", "selectTopic")
  .addEdge("selectTopic", "assignAuthor")
  .addEdge("assignAuthor", "writeArticle")
  .addEdge("writeArticle", "reviewArticle")
  .addConditionalEdges("reviewArticle", shouldRevise)
  .addEdge("reviseArticle", "reviewArticle")
  .addEdge("formatArticle", "generateImage")
  .addEdge("generateImage", "publish")
  .addEdge("publish", END);

export const graph = workflow.compile();

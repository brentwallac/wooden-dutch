import { StateGraph, START, END } from "@langchain/langgraph";
import { PipelineState } from "./state.js";
import { researchNews } from "./nodes/research-news.js";
import { generateCartoonConcept } from "./nodes/cartoon.js";
import { generateCartoonImage } from "./nodes/generate-cartoon-image.js";
import { formatArticle } from "./nodes/format.js";
import { publish } from "./nodes/publish.js";

// Cartoon pipeline: author is pre-assigned (Gil Framingham) in the orchestrator,
// so we skip assignAuthor and brainstorm/select — the cartoon node handles concept generation.
const workflow = new StateGraph(PipelineState)
  .addNode("researchNews", researchNews)
  .addNode("generateCartoonConcept", generateCartoonConcept)
  .addNode("generateCartoonImage", generateCartoonImage)
  .addNode("formatArticle", formatArticle)
  .addNode("publish", publish)
  .addEdge(START, "researchNews")
  .addEdge("researchNews", "generateCartoonConcept")
  .addEdge("generateCartoonConcept", "generateCartoonImage")
  .addEdge("generateCartoonImage", "formatArticle")
  .addEdge("formatArticle", "publish")
  .addEdge("publish", END);

export const cartoonGraph = workflow.compile();

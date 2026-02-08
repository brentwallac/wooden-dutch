import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getModel } from "../../services/langchain-model.js";
import { loadPrompt } from "../../prompts/loader.js";
import type { PipelineStateType } from "../state.js";

export async function reviseArticle(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  const topic = state.selectedTopic;
  const review = state.review;

  console.log(`Revising article (revision ${state.revisionCount + 1})...`);

  const promptText = loadPrompt("revise", {
    headline: topic.headline,
    subheadline: topic.subheadline,
    angle: topic.angle,
    articleHtml: state.articleHtml,
    score: String(review.score),
    toneCorrect: String(review.toneCorrect),
    wordCountOk: String(review.wordCountOk),
    satireQuality: review.satireQuality,
    htmlValid: String(review.htmlValid),
    feedback: review.feedback,
    authorName: state.assignedAuthor.name,
  });
  const systemText = loadPrompt("system", {
    authorName: state.assignedAuthor.name,
    authorVoice: state.assignedAuthor.voiceDescription,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemText],
    ["human", "{input}"],
  ]);

  const model = getModel(state.config);
  const chain = prompt.pipe(model);

  const result = await chain.invoke({ input: promptText });
  const html = typeof result.content === "string" ? result.content : "";

  if (!html.includes("<p>")) {
    throw new Error("Revised article does not appear to contain HTML");
  }

  console.log(`Article revised (${html.length} chars)`);

  return {
    articleHtml: html,
    revisionCount: state.revisionCount + 1,
  };
}

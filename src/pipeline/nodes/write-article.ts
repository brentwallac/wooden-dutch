import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getModel } from "../../services/langchain-model.js";
import { loadPrompt } from "../../prompts/loader.js";
import type { PipelineStateType } from "../state.js";

export async function writeArticle(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  const topic = state.selectedTopic;
  console.log(`Writing article for: "${topic.headline}"...`);

  const promptText = loadPrompt("article", {
    headline: topic.headline,
    subheadline: topic.subheadline,
    angle: topic.angle,
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
    throw new Error("Article response does not appear to contain HTML");
  }

  console.log(`Article written (${html.length} chars)`);

  return { articleHtml: html };
}

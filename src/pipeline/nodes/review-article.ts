import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getModel } from "../../services/langchain-model.js";
import { loadPrompt } from "../../prompts/loader.js";
import type { PipelineStateType } from "../state.js";

const reviewSchema = z.object({
  score: z.number().int().min(1).max(10).describe("Overall quality score from 1-10"),
  toneCorrect: z.boolean().describe("Whether the deadpan satirical tone is maintained throughout"),
  wordCountOk: z.boolean().describe("Whether the article is between 400-700 words"),
  satireQuality: z.enum(["weak", "good", "excellent"]).describe("Quality of satirical elements"),
  htmlValid: z.boolean().describe("Whether only allowed HTML tags are used"),
  feedback: z.string().describe("Specific, actionable improvement notes"),
});

export async function reviewArticle(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  const topic = state.selectedTopic;
  console.log("Reviewing article...");

  const promptText = loadPrompt("review", {
    headline: topic.headline,
    subheadline: topic.subheadline,
    articleHtml: state.articleHtml,
    authorName: state.assignedAuthor.name,
    authorVoice: state.assignedAuthor.voiceDescription,
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
  const structured = model.withStructuredOutput(reviewSchema, {
    name: "EditorialReview",
  });
  const chain = prompt.pipe(structured);

  const result = await chain.invoke({ input: promptText });

  console.log(`Review: score=${result.score}/10, tone=${result.toneCorrect}, satire=${result.satireQuality}`);
  if (result.score < 7) {
    console.log(`Feedback: ${result.feedback}`);
  }

  return { review: result };
}

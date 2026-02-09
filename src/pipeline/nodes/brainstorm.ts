import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getModel } from "../../services/langchain-model.js";
import { loadPrompt } from "../../prompts/loader.js";
import type { PipelineStateType } from "../state.js";

const topicSchema = z.object({
  headline: z.string().describe("The main headline — punchy, newspaper-style"),
  subheadline: z.string().describe("A secondary line that adds context or an extra joke"),
  angle: z.string().describe("2-3 sentences describing the satirical angle and key points to hit"),
  tags: z.array(z.string()).describe("3 relevant tags"),
});

const candidatesSchema = z.object({
  candidates: z.array(topicSchema).length(3).describe("Exactly 3 topic candidates"),
});

export async function brainstormTopics(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  console.log("Brainstorming topic candidates...");

  const avoidList =
    state.usedTopics.length > 0
      ? `\n\nAvoid these previously used headlines:\n${state.usedTopics.map((t) => `- ${t}`).join("\n")}`
      : "";

  const topicHint = state.options.topicHint
    ? `\n\nIMPORTANT: The editor has requested ALL 3 candidates focus on this specific theme: "${state.options.topicHint}". Generate 3 different satirical angles on this theme.`
    : "";

  const currentHeadlines =
    state.industryHeadlines.length > 0
      ? state.industryHeadlines.map((h) => `- ${h}`).join("\n")
      : "(no current headlines available)";

  const promptText = loadPrompt("brainstorm", { avoidList, currentHeadlines }) + topicHint;
  const systemText = loadPrompt("system", {
    authorName: "the editorial team",
    authorVoice: "You are a seasoned logistics journalism team brainstorming satirical article topics.",
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemText],
    ["human", "{input}"],
  ]);

  const model = getModel(state.config);
  const structured = model.withStructuredOutput(candidatesSchema, {
    name: "TopicCandidates",
  });
  const chain = prompt.pipe(structured);

  const result = await chain.invoke({ input: promptText });

  console.log(`Generated ${result.candidates.length} topic candidates:`);
  for (const [i, c] of result.candidates.entries()) {
    console.log(`  ${i + 1}. ${c.headline}`);
  }

  return { topicCandidates: result.candidates };
}

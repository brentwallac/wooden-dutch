import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getModel } from "../../services/langchain-model.js";
import { loadPrompt } from "../../prompts/loader.js";
import type { PipelineStateType } from "../state.js";

const cartoonSchema = z.object({
  title: z.string().describe("A short, punchy title for the cartoon (used as the Ghost post title)"),
  scene: z.string().describe("Detailed visual description of what the viewer sees in the single panel — describe characters, setting, objects, expressions, and spatial arrangement clearly enough for an illustrator to draw it"),
  caption: z.string().describe("The caption that appears below the cartoon — short, deadpan, lands the joke"),
  tags: z.array(z.string()).describe("3 relevant tags"),
});

export async function generateCartoonConcept(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  const author = state.assignedAuthor;
  console.log(`Generating cartoon concept as ${author.name}...`);

  const avoidList =
    state.usedTopics.length > 0
      ? `\n\nAvoid these previously used topics:\n${state.usedTopics.map((t) => `- ${t}`).join("\n")}`
      : "";

  const currentHeadlines =
    state.industryHeadlines.length > 0
      ? state.industryHeadlines.map((h) => `- ${h}`).join("\n")
      : "(no current headlines available)";

  const promptText = loadPrompt("cartoon", { avoidList, currentHeadlines });
  const systemText = loadPrompt("system", {
    authorName: author.name,
    authorVoice: author.voiceDescription,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemText],
    ["human", "{input}"],
  ]);

  const model = getModel(state.config);
  const structured = model.withStructuredOutput(cartoonSchema, {
    name: "CartoonConcept",
  });
  const chain = prompt.pipe(structured);

  const result = await chain.invoke({ input: promptText });

  console.log(`Cartoon concept: "${result.title}"`);
  console.log(`Caption: "${result.caption}"`);
  console.log(`Scene: ${result.scene}`);

  // Store cartoon data in the pipeline state using existing fields
  const cartoonHtml = `<figure class="cartoon-panel"><figcaption><p><em>${result.caption}</em></p></figcaption></figure>`;

  return {
    selectedTopic: {
      headline: result.title,
      subheadline: result.caption,
      angle: result.scene,
      tags: [...result.tags, "cartoon"],
    },
    articleHtml: cartoonHtml,
  };
}

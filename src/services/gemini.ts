import { GoogleGenAI, Modality } from "@google/genai";
import sharp from "sharp";
import type { Config } from "../config.js";

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 675;
const JPEG_QUALITY = 80;

export async function generateImage(
  config: Config,
  prompt: string,
): Promise<Buffer | null> {
  if (!config.gemini.apiKey) return null;

  const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });

  console.log("Generating feature image via Gemini...");

  try {
    const response = await ai.models.generateContent({
      model: config.gemini.modelId,
      contents: prompt,
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (p) => p.inlineData,
    );

    if (!imagePart?.inlineData?.data) {
      console.warn("Gemini returned no image data");
      return null;
    }

    const rawBuffer = Buffer.from(imagePart.inlineData.data, "base64");

    const optimized = await sharp(rawBuffer)
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: "cover" })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    console.log(
      `Feature image generated (${(rawBuffer.length / 1024).toFixed(0)}KB → ${(optimized.length / 1024).toFixed(0)}KB)`,
    );
    return optimized;
  } catch (error) {
    console.warn(
      "Image generation failed (non-fatal):",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

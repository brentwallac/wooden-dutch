import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROMPTS_DIR = join(process.cwd(), "data", "prompts");

const cache = new Map<string, string>();

export function loadPrompt(
  name: string,
  vars?: Record<string, string>,
): string {
  if (!cache.has(name)) {
    cache.set(name, readFileSync(join(PROMPTS_DIR, `${name}.txt`), "utf-8"));
  }

  let prompt = cache.get(name)!;

  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      prompt = prompt.replaceAll(`{{${key}}}`, value);
    }
  }

  return prompt.trim();
}

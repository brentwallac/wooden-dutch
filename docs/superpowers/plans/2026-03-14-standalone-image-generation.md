# Standalone Image Generation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone "Generate Image" button to the admin chat UI that extracts article context from the conversation, generates a feature image via Gemini, displays it inline, and optionally attaches it to the Ghost article.

**Architecture:** A new action handler (`generate-image`) uses Claude to extract headline/angle/summary from the conversation history, feeds that into the existing `buildImagePrompt` → `generateImage` (Gemini) flow, saves the image locally, and streams progress + result back to the UI. A follow-up "Attach to Ghost" action uploads the saved image to Ghost and associates it with the most recent article.

**Tech Stack:** Anthropic SDK (Claude for extraction), Gemini (`@google/genai` for image gen), Hono (action route), HTMX (UI updates)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/admin/views/components.ts` | Modify | Add "Generate Image" button to `actionButtons()` |
| `src/admin/actions.ts` | Modify | Add `handleGenerateImageStreaming()` async generator |
| `src/admin/chat.ts` | Modify | Add `generate-image` case to action endpoint |
| `src/admin/image-extract.ts` | Create | Claude extraction: conversation → `{headline, angle, summary}` |
| `src/admin/public/style.css` | Modify | Add `.generated-image` styles for inline display |

---

### Task 1: Create the Claude extraction function

**Files:**
- Create: `src/admin/image-extract.ts`

This function takes the conversation history and asks Claude to extract the headline, angle, and summary needed for the image prompt. Uses the existing Anthropic client pattern from `src/admin/claude.ts`.

- [ ] **Step 1: Create `src/admin/image-extract.ts`**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "../config.js";
import type { ChatMessage } from "./claude.js";

let client: Anthropic | null = null;

function getClient(config: Config): Anthropic {
  if (client) return client;
  client = new Anthropic({ apiKey: config.anthropic.apiKey });
  return client;
}

interface ImageContext {
  headline: string;
  angle: string;
  summary: string;
}

const EXTRACTION_PROMPT = `You are a photo editor. Given the conversation below, extract the article's details for a feature image brief.

Return ONLY valid JSON with these fields:
- "headline": the article's headline (string)
- "angle": a 1-sentence description of the article's satirical angle (string)
- "summary": a 1-2 sentence summary of what the article is about (string)

If the conversation doesn't contain a clear article, infer the most likely topic from the discussion.`;

export async function extractImageContext(
  config: Config,
  messages: ChatMessage[],
): Promise<ImageContext> {
  const anthropic = getClient(config);

  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: config.anthropic.modelId,
    max_tokens: 512,
    temperature: 0,
    system: EXTRACTION_PROMPT,
    messages: [{ role: "user", content: conversationText }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  const parsed = JSON.parse(cleaned) as ImageContext;
  return parsed;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `bun run typecheck`
Expected: No errors related to `image-extract.ts`

- [ ] **Step 3: Commit**

```bash
git add src/admin/image-extract.ts
git commit -m "feat(admin): add Claude extraction for image context from conversation"
```

---

### Task 2: Add the streaming image generation action handler

**Files:**
- Modify: `src/admin/actions.ts`

Add a new `handleGenerateImageStreaming()` async generator that: extracts context via Claude, generates the image via Gemini, saves it locally, and yields progress HTML.

- [ ] **Step 1: Add imports and handler to `src/admin/actions.ts`**

Add the import at the top:
```typescript
import { extractImageContext } from "./image-extract.js";
import type { ChatMessage } from "./claude.js";
```

Add the new handler function:
```typescript
export async function* handleGenerateImageStreaming(
  config: Config,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  yield `<div class="pipeline-progress">`;

  try {
    // Step 1: Extract context from conversation
    yield `<div class="progress-step">Extracting article context...</div>`;
    const context = await extractImageContext(config, messages);
    yield `<div class="progress-step">Topic: "${context.headline}"</div>`;

    // Step 2: Build prompt and generate image
    yield `<div class="progress-step">Generating image via Gemini...</div>`;
    const { buildImagePrompt } = await import("../prompts/image.js");
    const { generateImage } = await import("../services/gemini.js");

    const prompt = buildImagePrompt(
      { headline: context.headline, subheadline: "", angle: context.angle, tags: [] },
      context.summary,
    );
    const imageBuffer = await generateImage(config, prompt);

    if (!imageBuffer) {
      yield `<div class="action-result error">Image generation failed — Gemini returned no image. Check GEMINI_API_KEY is set.</div>`;
      yield `</div>`;
      return;
    }

    // Step 3: Save locally
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");

    const imagesDir = join(process.cwd(), "data", "drafts", "images");
    await mkdir(imagesDir, { recursive: true });

    const slug = context.headline
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const filename = `${slug}.jpg`;
    const filepath = join(imagesDir, filename);
    await writeFile(filepath, imageBuffer);

    yield `<div class="progress-step">Saved: data/drafts/images/${filename}</div>`;

    // Step 4: Show the image
    yield `<div class="pipeline-image"><img src="/admin/images/${filename}" alt="Generated feature image"></div>`;

    yield `<div class="action-result success">Image generated and saved locally.</div>`;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    yield `<div class="action-result error">Image generation failed: ${msg}</div>`;
  }

  yield `</div>`;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `bun run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/admin/actions.ts
git commit -m "feat(admin): add streaming image generation action handler"
```

---

### Task 3: Wire up the action route and UI button

**Files:**
- Modify: `src/admin/chat.ts` — add `generate-image` case to action endpoint
- Modify: `src/admin/views/components.ts` — add button to `actionButtons()`

- [ ] **Step 1: Add "Generate Image" button to `actionButtons()` in `src/admin/views/components.ts`**

Add a second button inside the `action-buttons` div, after the Publish button:

```typescript
export function actionButtons(conversationId: string): string {
  return `
    <div class="action-buttons" id="action-buttons">
      <button hx-post="/admin/chat/${conversationId}/action"
              hx-vals='{"action":"publish"}'
              hx-target="#action-status"
              hx-swap="innerHTML"
              class="btn btn-primary">Publish</button>
      <button hx-post="/admin/chat/${conversationId}/action"
              hx-vals='{"action":"generate-image"}'
              hx-target="#action-status"
              hx-swap="innerHTML"
              class="btn btn-secondary">Generate Image</button>
      <div id="action-status"></div>
    </div>`;
}
```

- [ ] **Step 2: Add `generate-image` case in `src/admin/chat.ts` action endpoint**

In the `chat.post("/admin/chat/:id/action", ...)` handler, import `handleGenerateImageStreaming` and add a case:

Add to imports at top of file:
```typescript
import { handleRunPipeline, handleRunPipelineStreaming, handleGenerateImageStreaming } from "./actions.js";
```

Add case in the switch statement:
```typescript
case "generate-image": {
  const allMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  const chunks: string[] = [];
  for await (const html of handleGenerateImageStreaming(config, allMessages)) {
    chunks.push(html);
  }
  return c.html(chunks.join(""));
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `bun run typecheck`
Expected: No errors

- [ ] **Step 4: Manual test**

1. Run: `bun run dev` (or start the admin server)
2. Open `http://localhost:3000/admin`
3. Start a new chat, discuss an article topic with Claude
4. After Claude responds, verify both "Publish" and "Generate Image" buttons appear
5. Click "Generate Image" — should see progress steps and the generated image inline

- [ ] **Step 5: Commit**

```bash
git add src/admin/views/components.ts src/admin/chat.ts
git commit -m "feat(admin): wire up standalone Generate Image button in chat UI"
```

---

### Task 4 (Optional Enhancement): Loading state on button click

The image generation takes a few seconds. The current action endpoint returns all HTML at once (not streamed via SSE). The button click will appear to hang briefly. Add an `hx-indicator` to show a loading state.

**Files:**
- Modify: `src/admin/views/components.ts`
- Modify: `src/admin/public/style.css`

- [ ] **Step 1: Add loading indicator to the Generate Image button**

Update the button in `actionButtons()` to include `hx-indicator`:

```html
<button hx-post="/admin/chat/${conversationId}/action"
        hx-vals='{"action":"generate-image"}'
        hx-target="#action-status"
        hx-swap="innerHTML"
        hx-indicator="#img-loading"
        class="btn btn-secondary">Generate Image</button>
<span id="img-loading" class="htmx-indicator">Generating...</span>
```

- [ ] **Step 2: Add indicator CSS to `src/admin/public/style.css`**

```css
.htmx-indicator {
  display: none;
  font-size: 0.85rem;
  color: #666;
  font-style: italic;
}

.htmx-indicator.htmx-request {
  display: inline;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/admin/views/components.ts src/admin/public/style.css
git commit -m "feat(admin): add loading indicator for image generation button"
```

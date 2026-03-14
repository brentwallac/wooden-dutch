import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { streamSSE } from "hono/streaming";
import { loadConfig } from "../config.js";
import {
  createConversation,
  listConversations,
  getMessages,
  addMessage,
  deleteConversation,
  getAllAuthors,
  getDb,
} from "./db.js";
import { streamChat } from "./claude.js";
import { assembleSystemContext } from "./context.js";
import { chatPage, chatPagePartial } from "./views/chat.js";
import { messageBubble, streamingBubble, actionButtons } from "./views/components.js";
import { handleRunPipeline, handleRunPipelineStreaming, handleGenerateImageStreaming } from "./actions.js";

const chat = new Hono();
const config = loadConfig();

// Cache the system context (refreshed per conversation or on demand)
let cachedSystemContext: string | null = null;

async function getSystemContext(): Promise<string> {
  if (!cachedSystemContext) {
    cachedSystemContext = await assembleSystemContext(config);
  }
  return cachedSystemContext;
}

export function invalidateContextCache(): void {
  cachedSystemContext = null;
}

// Active streams: shared between POST handler and SSE endpoint
// Key: conversationId, Value: AsyncGenerator from Claude
const activeStreams = new Map<string, {
  generator: AsyncGenerator<string>;
  chunks: string[];
  done: boolean;
  error: string | null;
  conversationId: string;
  assistantMsgId: string;
}>();

// --- List / show conversations ---
chat.get("/admin", async (c) => {
  const conversations = listConversations();
  const authors = getAllAuthors();
  return c.html(chatPage(conversations, null, [], authors));
});

chat.get("/admin/chat/:id", async (c) => {
  const id = c.req.param("id");
  const conversations = listConversations();
  const messages = getMessages(id);
  const authors = getAllAuthors();
  const formatted = messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // HTMX partial load — return just sidebar + chat area, not the full page
  if (c.req.header("HX-Request")) {
    return c.html(chatPagePartial(conversations, id, formatted, authors));
  }
  return c.html(chatPage(conversations, id, formatted, authors));
});

// --- Create new conversation ---
chat.post("/admin/chat/new", async (c) => {
  const id = randomUUID();
  createConversation(id);
  invalidateContextCache();
  return c.redirect(`/admin/chat/${id}`);
});

// --- Send message: saves user msg, starts Claude stream, returns user bubble + SSE placeholder ---
chat.post("/admin/chat/:id/message", async (c) => {
  const conversationId = c.req.param("id");
  const body = await c.req.parseBody();
  const content = (body.content as string)?.trim();

  if (!content) return c.html("", 400);

  // Save user message
  const userMsgId = randomUUID();
  addMessage(userMsgId, conversationId, "user", content);

  // Get conversation history for Claude
  const dbMessages = getMessages(conversationId);
  const chatMessages = dbMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Start Claude stream and store it for the SSE endpoint to consume
  const systemContext = await getSystemContext();
  const generator = streamChat(config, systemContext, chatMessages);
  const assistantMsgId = randomUUID();

  activeStreams.set(conversationId, {
    generator,
    chunks: [],
    done: false,
    error: null,
    conversationId,
    assistantMsgId,
  });

  // Auto-title from first message
  if (dbMessages.length === 1) {
    const title = content.slice(0, 60) + (content.length > 60 ? "..." : "");
    getDb().prepare("UPDATE conversations SET title = $title WHERE id = $id").run({ $title: title, $id: conversationId });
  }

  // Return user bubble + SSE streaming placeholder
  return c.html(messageBubble("user", content, userMsgId) + streamingBubble(conversationId));
});

// --- SSE stream: consumes the shared Claude generator started by POST ---
chat.get("/admin/chat/:id/stream", async (c) => {
  const conversationId = c.req.param("id");

  // Wait briefly for the stream to be set up (race between POST response and SSE connect)
  let streamState = activeStreams.get(conversationId);
  if (!streamState) {
    await new Promise((r) => setTimeout(r, 500));
    streamState = activeStreams.get(conversationId);
  }

  if (!streamState) {
    // No active stream — return empty and close immediately (don't show error for SSE reconnects)
    return streamSSE(c, async (stream) => {
      await stream.writeSSE({ event: "close", data: "" });
    });
  }

  return streamSSE(c, async (stream) => {
    try {
      console.log(`[SSE] Starting stream for conversation ${conversationId}`);
      // Consume the shared generator (started in POST handler)
      for await (const chunk of streamState.generator) {
        streamState.chunks.push(chunk);
        await stream.writeSSE({ event: "chunk", data: chunk });
      }

      // Save complete response to DB
      const fullResponse = streamState.chunks.join("");
      addMessage(streamState.assistantMsgId, conversationId, "assistant", fullResponse);

      // Send action buttons
      await stream.writeSSE({ event: "actions", data: actionButtons(conversationId) });

      // Signal completion — client will close the SSE connection
      await stream.writeSSE({ event: "close", data: "" });
    } catch (error) {
      console.error(`[SSE] Stream error:`, error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      // Save partial response if any
      if (streamState.chunks.length > 0) {
        const partial = streamState.chunks.join("");
        addMessage(streamState.assistantMsgId, conversationId, "assistant", partial);
      }
      await stream.writeSSE({
        event: "chunk",
        data: `<div class="error">Error: ${msg}. Try again.</div>`,
      });
      await stream.writeSSE({ event: "close", data: "" });
    } finally {
      activeStreams.delete(conversationId);
    }
  });
});

// --- Action endpoint ---
chat.post("/admin/chat/:id/action", async (c) => {
  const body = await c.req.parseBody();
  const action = body.action as string;
  const messages = getMessages(c.req.param("id"));
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");

  switch (action) {
    case "publish": {
      const chunks: string[] = [];
      for await (const html of handleRunPipelineStreaming(config, lastUserMsg?.content, false)) {
        chunks.push(html);
      }
      return c.html(chunks.join(""));
    }
    case "generate-image": {
      const allMessages = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      const imgChunks: string[] = [];
      for await (const html of handleGenerateImageStreaming(config, allMessages)) {
        imgChunks.push(html);
      }
      return c.html(imgChunks.join(""));
    }
    default:
      return c.html(`<div class="action-result">Action "${action}" — coming in next iteration.</div>`);
  }
});

// --- Delete conversation ---
chat.delete("/admin/chat/:id", async (c) => {
  const id = c.req.param("id");
  deleteConversation(id);

  // HTMX request — return updated sidebar + empty chat area
  if (c.req.header("HX-Request")) {
    const conversations = listConversations();
    const authors = getAllAuthors();
    return c.html(chatPagePartial(conversations, null, [], authors));
  }
  return c.redirect("/admin");
});

export { chat };

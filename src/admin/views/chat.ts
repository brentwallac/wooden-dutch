import { layout } from "./layout.js";
import { messageBubble, conversationListItem, authorCard } from "./components.js";
import type { AuthorPersona } from "../../data/authors.js";

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function chatPage(
  conversations: ConversationSummary[],
  activeConversationId: string | null,
  messages: Message[],
  authors: AuthorPersona[],
): string {
  const convList = conversations.length > 0
    ? conversations.map((c) => conversationListItem(c.id, c.title, c.updatedAt, c.id === activeConversationId)).join("")
    : '<p class="empty">No conversations yet.</p>';

  const messageList = messages.map((m) => messageBubble(m.role, m.content, m.id)).join("");
  const authorBar = authors.map((a) => authorCard(a)).join(" ");

  const content = `
    <nav class="top-bar">
      <div class="brand">Between Two Ports — Writer's Room</div>
      <div class="top-actions">
        <button hx-post="/admin/chat/new" hx-target="#main-content" hx-swap="innerHTML" hx-push-url="true" class="btn btn-small">New Chat</button>
        <a href="/admin/logout" class="btn btn-small btn-ghost">Sign Out</a>
      </div>
    </nav>
    <div class="app-layout" id="main-content">
      <aside class="sidebar">
        <div class="conv-list">${convList}</div>
      </aside>
      <main class="chat-area">
        <div class="messages" id="messages">
          ${messageList || '<p class="empty">Start a conversation...</p>'}
        </div>
        ${activeConversationId ? `
        <form class="chat-input" hx-post="/admin/chat/${activeConversationId}/message" hx-target="#messages" hx-swap="beforeend" hx-on::after-request="this.reset(); document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;">
          <input type="text" name="content" placeholder="Type a message..." autocomplete="off" required autofocus>
          <button type="submit" class="btn">Send</button>
        </form>
        ` : ""}
      </main>
    </div>
    <footer class="status-bar">
      <div class="author-bar">Authors: ${authorBar}</div>
      <div class="pipeline-status">Pipeline: Idle</div>
    </footer>
  `;

  return layout("Chat", content);
}

/** Partial HTML for HTMX swaps into #main-content (no nav/footer/layout wrapper) */
export function chatPagePartial(
  conversations: ConversationSummary[],
  activeConversationId: string | null,
  messages: Message[],
  authors: AuthorPersona[],
): string {
  const convList = conversations.length > 0
    ? conversations.map((c) => conversationListItem(c.id, c.title, c.updatedAt, c.id === activeConversationId)).join("")
    : '<p class="empty">No conversations yet.</p>';

  const messageList = messages.map((m) => messageBubble(m.role, m.content, m.id)).join("");

  return `
    <aside class="sidebar">
      <div class="conv-list">${convList}</div>
    </aside>
    <main class="chat-area">
      <div class="messages" id="messages">
        ${messageList || '<p class="empty">Start a conversation...</p>'}
      </div>
      ${activeConversationId ? `
      <form class="chat-input" hx-post="/admin/chat/${activeConversationId}/message" hx-target="#messages" hx-swap="beforeend" hx-on::after-request="this.reset(); document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;">
        <input type="text" name="content" placeholder="Type a message..." autocomplete="off" required autofocus>
        <button type="submit" class="btn">Send</button>
      </form>
      ` : ""}
    </main>
  `;
}

export function chatMessages(messages: Message[]): string {
  return messages.map((m) => messageBubble(m.role, m.content, m.id)).join("");
}

export function messageBubble(role: "user" | "assistant", content: string, id?: string): string {
  const icon = role === "user" ? "You" : "Claude";
  const cls = role === "user" ? "msg-user" : "msg-assistant";
  return `
    <div class="message ${cls}" ${id ? `id="msg-${id}"` : ""}>
      <div class="msg-role">${icon}</div>
      <div class="msg-content">${role === "assistant" ? content : escapeHtml(content)}</div>
    </div>`;
}

export function streamingBubble(conversationId: string): string {
  return `
    <div class="message msg-assistant" id="streaming-msg">
      <div class="msg-role">Claude</div>
      <div class="msg-content"
        hx-ext="sse"
        sse-connect="/admin/chat/${conversationId}/stream"
        sse-swap="chunk"
        hx-swap="beforeend">
        <span class="typing">Thinking...</span>
      </div>
    </div>`;
}

export function actionButtons(conversationId: string): string {
  return `
    <div class="action-buttons" id="action-buttons">
      <button hx-post="/admin/chat/${conversationId}/action"
              hx-vals='{"action":"publish"}'
              hx-target="#action-status"
              hx-swap="innerHTML"
              class="btn btn-primary">Publish to Ghost</button>
      <button hx-post="/admin/chat/${conversationId}/action"
              hx-vals='{"action":"draft"}'
              hx-target="#action-status"
              hx-swap="innerHTML"
              class="btn btn-secondary">Save as Draft</button>
      <button hx-post="/admin/chat/${conversationId}/action"
              hx-vals='{"action":"pipeline"}'
              hx-target="#action-status"
              hx-swap="innerHTML"
              class="btn btn-secondary">Run Pipeline</button>
      <div id="action-status"></div>
    </div>`;
}

export function conversationListItem(id: string, title: string, updatedAt: string, isActive: boolean): string {
  const cls = isActive ? "conv-item active" : "conv-item";
  const date = updatedAt.slice(0, 10);
  return `
    <a href="/admin/chat/${id}" class="${cls}" hx-get="/admin/chat/${id}" hx-push-url="true" hx-target="#main-content" hx-swap="innerHTML">
      <span class="conv-title">${escapeHtml(title)}</span>
      <span class="conv-date">${date}</span>
    </a>`;
}

export function authorCard(author: { id: string; name: string; title: string; topicAffinities: string[] }): string {
  return `<span class="author-tag" title="${author.title} — ${author.topicAffinities.slice(0, 3).join(", ")}">${author.name}</span>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

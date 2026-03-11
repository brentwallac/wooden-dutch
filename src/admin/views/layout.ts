export function layout(title: string, content: string, includeHtmx = true): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Between Two Ports</title>
  ${includeHtmx ? `
  <script src="https://unpkg.com/htmx.org@2.0.4"></script>
  <script src="https://unpkg.com/htmx-ext-sse@2.2.4/sse.js"></script>
  <script src="https://unpkg.com/marked@15.0.7/marked.min.js"></script>
  ` : ""}
  <link rel="stylesheet" href="/admin/style.css">
</head>
<body>
  ${content}
  ${includeHtmx ? `
  <script>
    // Track raw markdown text for streaming messages
    window._streamText = {};

    // Listen for SSE chunks and render markdown
    document.body.addEventListener('htmx:sseMessage', function(e) {
      var type = e.detail.type;

      // Handle close event — disconnect SSE to stop reconnects
      if (type === 'close') {
        var streamEl = document.getElementById('streaming-msg');
        if (streamEl) {
          // Final render: use marked for markdown, leave HTML as-is
          var raw = window._streamText['current'] || '';
          var msgContent = streamEl.querySelector('.msg-content');
          if (msgContent && raw) {
            var looksLikeHtml = /^\s*<[a-z][\s\S]*>/i.test(raw);
            msgContent.innerHTML = looksLikeHtml ? raw : marked.parse(raw);
          }
          streamEl.removeAttribute('hx-ext');
          streamEl.removeAttribute('sse-connect');
          streamEl.removeAttribute('id');
          window._streamText = {};
          // Re-process so HTMX picks up hx-post on injected action buttons
          htmx.process(streamEl);
        }
        e.preventDefault();
        return;
      }

      // Only handle chunk events for markdown rendering
      if (type !== 'chunk') return;

      // Always prevent default — we handle rendering ourselves
      e.preventDefault();

      var streamEl = document.getElementById('streaming-msg');
      if (!streamEl) return;

      var msgContent = streamEl.querySelector('.msg-content');
      if (!msgContent) return;

      // Remove "Thinking..." on first chunk
      var typing = msgContent.querySelector('.typing');
      if (typing) typing.remove();

      // Accumulate raw text
      if (!window._streamText['current']) window._streamText['current'] = '';
      window._streamText['current'] += e.detail.data;

      // Render progressively — use marked for markdown, innerHTML for HTML
      var raw = window._streamText['current'];
      var looksLikeHtml = /^\s*<[a-z]/i.test(raw);
      if (looksLikeHtml) {
        msgContent.innerHTML = raw;
      } else {
        try { msgContent.innerHTML = marked.parse(raw); } catch(ex) { msgContent.textContent = raw; }
      }

      // Only auto-scroll if user is near the bottom already
      var messages = document.getElementById('messages');
      if (messages) {
        var distFromBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight;
        if (distFromBottom < 100) messages.scrollTop = messages.scrollHeight;
      }
    });

    // Render markdown for existing assistant messages on page load
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('.msg-assistant .msg-content').forEach(function(el) {
        var text = el.textContent || '';
        if (!text.trim()) return;
        // Skip if already contains rendered HTML (has child elements)
        if (el.children.length > 0) return;
        el.innerHTML = marked.parse(text);
      });
    });
  </script>
  ` : ""}
</body>
</html>`;
}

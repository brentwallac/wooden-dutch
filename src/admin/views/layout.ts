export function layout(title: string, content: string, includeHtmx = true): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — The Wooden Dutch</title>
  ${includeHtmx ? `
  <script src="https://unpkg.com/htmx.org@2.0.4"></script>
  <script src="https://unpkg.com/htmx-ext-sse@2.3.0/sse.js"></script>
  ` : ""}
  <link rel="stylesheet" href="/admin/style.css">
</head>
<body>
  ${content}
</body>
</html>`;
}

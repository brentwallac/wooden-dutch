FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY src/ src/
COPY data/prompts/ data/prompts/
COPY tsconfig.json ./

# Create directories for runtime data
RUN mkdir -p data/drafts/images data/db

EXPOSE 3000

CMD ["bun", "src/admin/server.ts"]

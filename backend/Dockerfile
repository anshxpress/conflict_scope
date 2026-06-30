FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --production

# Copy source
COPY . .

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["bun", "run", "src/index.ts"]

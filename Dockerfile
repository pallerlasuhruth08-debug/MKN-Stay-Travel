FROM node:20-bookworm-slim AS builder

WORKDIR /app

# better-sqlite3 ships prebuilt binaries for most platforms, but keep build
# tools available in this stage so it can compile from source as a fallback.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/index.js"]

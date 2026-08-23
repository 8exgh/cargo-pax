# Stage 1: Builder
FROM node:22 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# The runtime image ships its own Chromium; don't download one here
ENV PUPPETEER_SKIP_DOWNLOAD=1

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production Runtime
# Debian slim rather than alpine: Debian's chromium package is the
# dependable way to run headless Chrome for Puppeteer.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Chromium refuses to run as root without --no-sandbox; run unprivileged
RUN groupadd --system processor && useradd --system --gid processor --create-home processor \
  && chown -R processor:processor /app
USER processor

# Set environment variables with defaults
ENV NODE_ENV=production
ENV POLLING_INTERVAL_MS=5000
ENV PUPPETEER_HEADLESS=true

# Build metadata, logged at startup
ARG GIT_COMMIT=unknown
ARG BUILD_TIME=unknown
ENV GIT_COMMIT=$GIT_COMMIT
ENV BUILD_TIME=$BUILD_TIME

# Start background processor
CMD ["node", "dist/index.js"]

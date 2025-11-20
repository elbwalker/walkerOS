# walkerOS Docker Container
# Runtime container with baked-in web bundle and demo bundles
# Multi-stage build for optimized production images

# ============================================================================
# Stage 1: Build CLI and Bundle web-serve.mjs
# ============================================================================
FROM node:22-alpine AS bundler

WORKDIR /build

# Copy workspace configuration
COPY package.json package-lock.json turbo.json ./

# Copy all package.json files for dependency resolution
COPY packages/cli/package.json ./packages/cli/
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/collector/package.json ./packages/collector/
COPY packages/web/core/package.json ./packages/web/core/
COPY packages/web/sources/demo/package.json ./packages/web/sources/demo/
COPY packages/web/destinations/demo/package.json ./packages/web/destinations/demo/
COPY packages/web/destinations/api/package.json ./packages/web/destinations/api/

# Install dependencies for CLI build
RUN npm ci

# Copy all required packages
COPY packages/config ./packages/config
COPY packages/core ./packages/core
COPY packages/collector ./packages/collector
COPY packages/web/core ./packages/web/core
COPY packages/web/sources/demo ./packages/web/sources/demo
COPY packages/web/destinations/demo ./packages/web/destinations/demo
COPY packages/web/destinations/api ./packages/web/destinations/api
COPY packages/cli ./packages/cli

# Build all packages needed for bundling
RUN npm run build --workspace=@walkeros/core && \
    npm run build --workspace=@walkeros/collector && \
    npm run build --workspace=@walkeros/web-core && \
    npm run build --workspace=@walkeros/source-demo && \
    npm run build --workspace=@walkeros/destination-demo && \
    npm run build --workspace=@walkeros/web-destination-api && \
    npm run build --workspace=@walkeros/cli

# Bundle web-serve.json to create baked-in default bundle
RUN cd packages/cli && \
    node dist/index.js bundle examples/web-serve.json --local

# ============================================================================
# Stage 2: Build Docker Runtime
# ============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY package.json package-lock.json turbo.json ./
COPY packages/docker/package.json ./packages/docker/

# Copy only config package (for build tools)
COPY packages/config ./packages/config

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy docker source code
COPY packages/docker ./packages/docker

# Build the docker package (pure runtime only)
RUN npm run build --workspace=@walkeros/docker

# ============================================================================
# Stage 3: Production Runtime
# ============================================================================
FROM node:22-alpine

WORKDIR /app

# Install tini for proper signal handling
RUN apk add --no-cache tini

# Install production dependencies only
COPY package.json package-lock.json ./
COPY packages/docker/package.json ./packages/docker/

# Copy only the Docker runtime (no build tools, no other packages)
COPY --from=builder /app/packages/docker/dist ./packages/docker/dist

# Copy baked-in web bundle from bundler stage
COPY --from=bundler /build/packages/cli/web-serve.mjs /app/web-serve.mjs

# Copy demo bundles for quick-start testing
# Note: Demo bundles are self-contained (only use express/cors at runtime)
COPY packages/docker/demos /app/demos

# Install production dependencies
# - Workspace install: For runtime code (packages/docker/dist)
# After Phase 1, demo bundles are self-contained (no @walkeros/core needed)
RUN npm ci --production --workspace=@walkeros/docker

# Create non-root user
RUN addgroup -g 1001 walker && \
    adduser -D -u 1001 -G walker walker

# Create necessary directories and set ownership
RUN mkdir -p /app/dist && \
    chown -R walker:walker /app && \
    chmod 1777 /tmp

# Switch to non-root user
USER walker

# Default environment variables
ENV MODE=collect \
    NODE_ENV=production

# Health check (for collect mode)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Expose default port
EXPOSE 8080

# Entry point (use tini for proper signal handling)
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "packages/docker/dist/index.mjs"]

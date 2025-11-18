# walkerOS Docker Container
# Runtime container with demo bundles for quick-start testing
# Multi-stage build for optimized production images

# ============================================================================
# Stage 1: Build
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
# Stage 2: Production Runtime
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

# Copy demo bundles for quick-start testing
# Note: Demos use external dependencies (zod, express, cors)
COPY packages/docker/demos /app/demos

# Install production dependencies
# - Workspace install: For runtime code (packages/docker/dist)
# - Root install: For demo bundles to resolve dependencies
RUN npm ci --production --workspace=@walkeros/docker && \
    npm install --production --package-lock-only=false express cors @walkeros/core@^0.3.1

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

# walkerOS Docker Container
# Multi-stage build for optimized production images

# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY package.json package-lock.json turbo.json ./
COPY packages/docker/package.json ./packages/docker/

# Copy all required packages for monorepo
COPY packages/core ./packages/core
COPY packages/collector ./packages/collector
COPY packages/cli ./packages/cli
COPY packages/cli/templates ./packages/cli/templates
COPY packages/config ./packages/config

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy docker source code
COPY packages/docker ./packages/docker

# Build the docker package
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

# Copy built packages from builder
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/collector/dist ./packages/collector/dist
COPY --from=builder /app/packages/collector/package.json ./packages/collector/
COPY --from=builder /app/packages/cli/dist ./packages/cli/dist
COPY --from=builder /app/packages/cli/package.json ./packages/cli/
COPY --from=builder /app/packages/cli/templates ./packages/cli/templates
COPY --from=builder /app/packages/docker/dist ./packages/docker/dist
COPY --from=builder /app/packages/docker/configs ./packages/docker/configs

# Install production dependencies
RUN npm ci --production --workspace=@walkeros/docker

# Create non-root user
RUN addgroup -g 1001 walker && \
    adduser -D -u 1001 -G walker walker

# Create necessary directories and set ownership
RUN mkdir -p /app/dist /app/config && \
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
CMD ["node", "packages/docker/dist/index.js"]

# walkerOS Docker Container
# Multi-stage build for optimized production images

# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY package.json package-lock.json turbo.json ./
COPY packages/docker/package.json ./packages/docker/

# Copy all required packages for monorepo
COPY packages/core ./packages/core
COPY packages/collector ./packages/collector
COPY packages/cli ./packages/cli
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
FROM node:18-alpine

WORKDIR /app

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

# Install production dependencies
RUN npm ci --production --workspace=@walkeros/docker

# Create non-root user
RUN addgroup -g 1001 walker && \
    adduser -D -u 1001 -G walker walker

# Create necessary directories
RUN mkdir -p /app/dist /app/config && \
    chown -R walker:walker /app

# Switch to non-root user
USER walker

# Default environment variables
ENV MODE=collect \
    CONFIG_FILE=/app/config.json \
    NODE_ENV=production

# Health check (for collect mode)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Expose default port
EXPOSE 8080

# Entry point
CMD ["node", "packages/docker/dist/index.js"]

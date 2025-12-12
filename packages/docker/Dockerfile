# walkerOS Docker Container
# Runtime container for executing pre-built flows
# Expects dist/ to be pre-built before docker build

FROM node:22-alpine

WORKDIR /app

# Install tini for proper signal handling
RUN apk add --no-cache tini

# Copy pre-built dist (built in CI before docker build)
COPY packages/docker/dist ./packages/docker/dist

# Copy demo bundles for quick-start testing
COPY packages/docker/demos /app/demos

# Install only the runtime dependencies (express, cors)
# Note: @walkeros/core is bundled into dist, not needed at runtime
RUN npm install express@^4.18.2 cors@^2.8.5 --omit=dev

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

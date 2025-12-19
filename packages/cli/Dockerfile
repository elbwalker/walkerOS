# walkeros/flow - Production Runtime Image
# Runtime container for executing pre-built walkerOS flows
# Expects dist/runtime/ to be pre-built before docker build

FROM node:22-alpine

# Install tini for proper signal handling
RUN apk add --no-cache tini

# Create non-root user
RUN addgroup -g 1001 walker && \
    adduser -D -u 1001 -G walker walker

WORKDIR /app

# Install only production runtime dependencies
# Note: @walkeros/core is bundled into dist, not needed at runtime
RUN npm install express@^4.21.2 cors@^2.8.5 --omit=dev && \
    npm cache clean --force

# Copy pre-built runtime code
COPY packages/cli/dist/runtime/ ./runtime/

# Create flow directory for mounted bundles
RUN mkdir -p /flow && chown -R walker:walker /app /flow

# Switch to non-root user
USER walker

# Default environment variables
ENV NODE_ENV=production
ENV MODE=collect
ENV PORT=8080
ENV FILE=/flow/bundle.mjs

# Expose default port
EXPOSE 8080

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Entry point with tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "runtime/main.js"]

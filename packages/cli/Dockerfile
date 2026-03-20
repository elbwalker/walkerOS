# walkeros/flow - Production Runtime Image
# Self-bundling runner: fetches config, bundles locally, runs the flow.
# Same image for all modes: local (A), registered (B), remote (C), managed (D).

FROM node:22-alpine

# Install tini for proper signal handling
RUN apk add --no-cache tini

ARG CLI_VERSION=latest

# Create non-root user
RUN addgroup -g 1001 walker && \
    adduser -D -u 1001 -G walker walker

WORKDIR /app

# Install CLI — server bundles are self-contained (no runtime node_modules needed)
RUN npm install --omit=dev @walkeros/cli@${CLI_VERSION}

# Create directories for mounted configs and bundle cache
RUN mkdir -p /app/flow /app/cache && chown -R walker:walker /app

# Switch to non-root user
USER walker

# Default environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV BUNDLE=/app/flow/bundle.mjs

# Expose default port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "const h=require('http');h.get('http://localhost:'+(process.env.PORT||8080)+'/ready',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Ensure walkeros binary is on PATH
ENV PATH="/app/node_modules/.bin:${PATH}"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["walkeros", "run"]

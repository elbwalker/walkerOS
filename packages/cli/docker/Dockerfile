# WalkerOS CLI Docker Image
# Provides a dependency-free environment for running WalkerOS CLI commands

FROM node:22-alpine

# Set working directory for CLI installation
WORKDIR /cli

# Copy package files
COPY package*.json ./

# Install only production dependencies
# Note: Using npm install instead of npm ci since this is a monorepo
# and package-lock.json is at the root level
RUN npm install --omit=dev --no-audit

# Copy built CLI distribution
COPY dist ./dist

# Copy examples for zero-config usage
COPY examples ./examples

# Set working directory for user projects
# All commands will run relative to this directory
WORKDIR /workspace

# Set environment variable to indicate container environment
ENV WALKEROS_CONTAINER=true

# Entry point is the CLI
# Users can run: docker run walkeros/cli:latest bundle config.json
ENTRYPOINT ["node", "/cli/dist/index.js"]

# Default command shows help
CMD ["--help"]

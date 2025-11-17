# @walkeros/docker

Pure runtime Docker container for walkerOS - executes pre-built flow bundles
with instant startup and minimal footprint.

## Overview

This is a **runtime-only** container designed for production deployment. It does
NOT bundle or build flows - it only executes pre-built `.mjs` bundles.

**Key Characteristics:**

- ⚡ **<1s startup** - No npm downloads or build steps at runtime
- 📦 **~50MB image** - Only runtime dependencies (express, cors, zod)
- 🔒 **Secure** - No build tools or package managers in production
- ☁️ **Cloud-optimized** - Perfect for GCP Cloud Run, Kubernetes, ECS
- 🎯 **Single responsibility** - Execute flows, nothing else

## Architecture

```
Build Phase (CLI)          Runtime Phase (Docker)
─────────────────         ────────────────────────
flow.json                 flow.mjs (pre-built)
    ↓                            ↓
CLI bundles              Docker imports & runs
    ↓                            ↓
flow.mjs  ──────────────→  Running collector
```

**What's included:** Express server, flow executor, graceful shutdown **What's
NOT included:** CLI, bundler, npm, build tools

See [docs/CAPABILITIES.md](./docs/CAPABILITIES.md) for detailed architecture
documentation.

## Quick Start

### Step 1: Build Your Flow

Use [@walkeros/cli](../cli/README.md) to bundle your flow configuration:

```bash
# Install CLI
npm install -g @walkeros/cli

# Create and bundle your flow
walkeros bundle flow.json --output flow.mjs
```

### Step 2: Run in Docker

```bash
docker run -p 8080:8080 \
  -v $(pwd)/flow.mjs:/app/flow.mjs \
  -e MODE=collect \
  -e FLOW=/app/flow.mjs \
  walkeros/docker:latest
```

## Instant Demo

Want to try walkerOS Docker immediately? Use the included demo bundles - no CLI
or bundling required:

### Event Collector Demo

```bash
docker run -p 8080:8080 \
  -e MODE=collect \
  -e FLOW=/app/demos/demo-collect.mjs \
  walkeros/docker:latest
```

Test it:

```bash
curl -X POST http://localhost:8080/collect \
  -H "Content-Type: application/json" \
  -d '{"name":"page view","data":{"title":"Test"}}'
```

### Web Bundle Demo

```bash
docker run -p 3000:8080 \
  -e MODE=serve \
  -e FLOW=/app/demos/demo-serve.mjs \
  walkeros/docker:latest
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see
automatic event tracking.

### Full Demo Loop

Run both demos together to see the complete event flow from browser to
collector:

**Terminal 1 - Start Collector:**

```bash
docker run -p 8080:8080 \
  -e MODE=collect \
  -e FLOW=/app/demos/demo-collect.mjs \
  --name walker-collector \
  walkeros/docker:latest
```

**Terminal 2 - Start Web Bundle:**

```bash
docker run -p 3000:8080 \
  -e MODE=serve \
  -e FLOW=/app/demos/demo-serve.mjs \
  --name walker-web \
  walkeros/docker:latest
```

Open [http://localhost:3000](http://localhost:3000) and watch events flow from
browser → Terminal 1 collector logs.

**Cleanup:**

```bash
docker stop walker-collector walker-web && docker rm walker-collector walker-web
```

See [demos/README.md](./demos/README.md) for detailed demo documentation.

## Usage Patterns

### Local Development with Volume Mount

```bash
# Bundle your flow
walkeros bundle flow.json --output flow.mjs

# Run with volume mount
docker run -p 8080:8080 \
  -v $(pwd)/flow.mjs:/app/flow.mjs \
  -e MODE=collect \
  -e FLOW=/app/flow.mjs \
  walkeros/docker:latest
```

### Production Deployment (Recommended)

Build a custom image with your bundled flow:

```dockerfile
FROM walkeros/docker:latest
COPY flow.mjs /app/flow.mjs
ENV MODE=collect
ENV FLOW=/app/flow.mjs
```

```bash
docker build -t my-collector .
docker run -p 8080:8080 my-collector
```

### GCP Cloud Run Deployment

```bash
# Build production bundle
walkeros bundle production.json --output flow.mjs

# Create Dockerfile
cat > Dockerfile <<EOF
FROM walkeros/docker:latest
COPY flow.mjs /app/flow.mjs
ENV MODE=collect
ENV FLOW=/app/flow.mjs
EOF

# Deploy
gcloud run deploy my-collector \
  --source . \
  --port 8080 \
  --allow-unauthenticated
```

## Operational Modes

Two operational modes via `MODE` environment variable:

### collect

Runs event collection server - executes the flow bundle which typically starts
an HTTP server.

```bash
docker run -p 8080:8080 \
  -e MODE=collect \
  -e FLOW=/app/flow.mjs \
  -v $(pwd)/flow.mjs:/app/flow.mjs \
  walkeros/docker:latest
```

### serve

Serves static files (useful for web bundles):

```bash
docker run -p 8080:8080 \
  -e MODE=serve \
  -e STATIC_DIR=/app/dist \
  -v $(pwd)/dist:/app/dist \
  walkeros/docker:latest
```

## Environment Variables

### Required

- **`MODE`** - Operational mode: `collect` or `serve`
- **`FLOW`** - Path to pre-built flow bundle (`.mjs` file) - **required for
  collect mode**

### Optional

- **`PORT`** - Server port (default: from flow or 8080)
- **`HOST`** - Server host (default: 0.0.0.0)
- **`STATIC_DIR`** - Static files directory for serve mode (default: /app/dist)

**Example:**

```bash
docker run -p 3000:3000 \
  -e MODE=collect \
  -e FLOW=/app/flow.mjs \
  -e PORT=3000 \
  -e HOST=0.0.0.0 \
  -v $(pwd)/flow.mjs:/app/flow.mjs \
  walkeros/docker:latest
```

## Docker Compose

```yaml
version: '3.8'

services:
  collector:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      MODE: collect
      FLOW: /app/flow.mjs
      PORT: 8080
    ports:
      - '8080:8080'
    restart: unless-stopped
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "require('http').get('http://localhost:8080/health', (r) =>
          process.exit(r.statusCode === 200 ? 0 : 1))",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
```

**Dockerfile:**

```dockerfile
FROM walkeros/docker:latest
COPY flow.mjs /app/flow.mjs
ENV MODE=collect
ENV FLOW=/app/flow.mjs
```

## Development

### Build Package

```bash
npm run build
```

### Run Locally (without Docker)

The Docker package exports functions that can be used directly in Node.js:

```typescript
import { runFlow, runServeMode } from '@walkeros/docker';

// Run a pre-built flow
await runFlow('/path/to/flow.mjs', {
  port: 8080,
  host: '0.0.0.0',
});

// Or run serve mode
await runServeMode({
  port: 8080,
  staticDir: '/path/to/dist',
});
```

### Build Docker Image

```bash
# From monorepo root
docker build -t walkeros/docker:latest -f packages/docker/Dockerfile .

# Test with a bundled flow
walkeros bundle flow.json --output flow.mjs
docker run -p 8080:8080 \
  -v $(pwd)/flow.mjs:/app/flow.mjs \
  -e MODE=collect \
  -e FLOW=/app/flow.mjs \
  walkeros/docker:latest
```

### Testing

```bash
npm test
```

See comprehensive guides in [docs/](./docs/):

- **[CAPABILITIES.md](./docs/CAPABILITIES.md)** - Architecture and capabilities
- **[LOCAL-TESTING.md](./docs/LOCAL-TESTING.md)** - Testing Docker images
  locally
- **[DOCKER-HUB.md](./docs/DOCKER-HUB.md)** - Publishing to Docker Hub

## Library Usage

The Docker package can be imported as a library (used by @walkeros/cli):

```typescript
import {
  runFlow,
  runServeMode,
  type RuntimeConfig,
  type ServeConfig,
} from '@walkeros/docker';

// Execute a pre-built flow
await runFlow('/path/to/flow.mjs', {
  port: 8080,
  host: '0.0.0.0',
});

// Or run in serve mode
await runServeMode({
  port: 3000,
  staticDir: './dist',
});
```

This is how `@walkeros/cli` uses the Docker package - no Docker daemon required!

## Troubleshooting

### "FLOW environment variable required"

Ensure you're providing the FLOW env var pointing to a pre-built `.mjs` file:

```bash
docker run \
  -e MODE=collect \
  -e FLOW=/app/flow.mjs \
  -v $(pwd)/flow.mjs:/app/flow.mjs \
  walkeros/docker:latest
```

### "Cannot find module"

The FLOW path must point to a pre-built `.mjs` bundle, not a `.json` config:

```bash
# ❌ Wrong - JSON config
-e FLOW=/app/flow.json

# ✅ Correct - Pre-built bundle
-e FLOW=/app/flow.mjs
```

### Port already in use

- Check what's using the port: `lsof -i :8080`
- Use a different port: `-p 3000:8080`
- Port in flow configuration vs Docker mapping must match

## Docker Hub

Official image: `walkeros/docker`

```bash
# Pull latest
docker pull walkeros/docker:latest

# Pull specific version
docker pull walkeros/docker:0.1.0
```

## What's Different from CLI?

| Feature             | @walkeros/docker      | @walkeros/cli               |
| ------------------- | --------------------- | --------------------------- |
| **Purpose**         | Runtime execution     | Build + orchestration       |
| **Bundling**        | ❌ No                 | ✅ Yes                      |
| **Dependencies**    | 3 (runtime only)      | 10 (includes Docker)        |
| **Image Size**      | ~50MB                 | N/A                         |
| **Startup**         | <1s                   | N/A                         |
| **Docker Required** | For containerization  | No (uses Docker as library) |
| **Use Case**        | Production deployment | Development + build         |

## Version & Status

**Current Version:** 0.1.0 **Recommended Next Version:** 0.2.0 (breaking
changes)

### Production Ready ✅

- ✅ Pure runtime architecture - zero build dependencies
- ✅ Library exports for CLI integration
- ✅ Collect and serve modes
- ✅ <1s startup time
- ✅ ~50MB Docker image
- ✅ Graceful shutdown handling
- ✅ GCP Cloud Run optimized

### Breaking Changes from Previous Versions

- ❌ No longer accepts JSON configs at runtime
- ❌ Must receive pre-built .mjs bundles via FLOW env var
- ❌ Removed all bundling, build, and package download capabilities
- ✅ Use @walkeros/cli to bundle flows first

## License

MIT

## Support

- GitHub Issues: https://github.com/elbwalker/walkerOS/issues
- Documentation: https://github.com/elbwalker/walkerOS

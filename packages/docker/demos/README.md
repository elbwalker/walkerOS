# walkerOS Docker Demos

This directory contains **pre-built demo bundles** ready to use immediately with
the walkerOS Docker image. No CLI setup or bundling required - just run and
test!

## Included Demo Bundles

This directory contains two ready-to-run demo bundles:

### 1. `demo-collect.mjs` (~96KB)

Server-side event collection demo. Starts an HTTP server that receives and
processes events.

**Run instantly:**

```bash
docker run -p 8080:8080 \
  -e MODE=collect \
  -e FLOW=/app/demos/demo-collect.mjs \
  walkeros/docker:latest
```

**Test it:**

```bash
curl -X POST http://localhost:8080/collect \
  -H "Content-Type: application/json" \
  -d '{"name":"page view","data":{"title":"Test Page"}}'
```

### 2. `demo-serve.mjs` (~376KB)

Web bundle demo with automatic browser event tracking.

**Run instantly:**

```bash
docker run -p 3000:8080 \
  -e MODE=serve \
  -e FLOW=/app/demos/demo-serve.mjs \
  walkeros/docker:latest
```

**Open in browser:** http://localhost:3000

## Complete Demo Flow

Run both demos together to see the full event pipeline (browser → collector):

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

Open http://localhost:3000 and watch events flow to Terminal 1.

**Cleanup:**

```bash
docker stop walker-collector walker-web && docker rm walker-collector walker-web
```

## Custom Production Deployment

For production, bundle your own flow configuration:

**Step 1: Bundle your flow**

```bash
npm install -g @walkeros/cli
walkeros bundle --config my-flow.json --output my-flow.mjs
```

**Step 2: Deploy to Docker**

```bash
docker run -p 8080:8080 \
  -v $(pwd)/my-flow.mjs:/app/flow.mjs \
  -e MODE=collect \
  -e FLOW=/app/flow.mjs \
  walkeros/docker:latest
```

Or build a custom image:

```dockerfile
FROM walkeros/docker:latest
COPY my-flow.mjs /app/flow.mjs
ENV MODE=collect
ENV FLOW=/app/flow.mjs
```

## Rebuilding Demo Bundles

These demos are built from the CLI examples. To rebuild:

```bash
cd packages/cli

# Rebuild collector demo
node dist/index.mjs bundle --config examples/server-collect.json --local
cp server-collect.mjs ../docker/demos/demo-collect.mjs

# Rebuild serve demo
node dist/index.mjs bundle --config examples/web-serve.json --local
cp web-serve.mjs ../docker/demos/demo-serve.mjs
```

## Documentation

- [Docker Package README](../README.md) - Full Docker documentation
- [CLI Documentation](../../cli/README.md) - Building custom flows
- [walkerOS Documentation](https://github.com/elbwalker/walkerOS) - Complete
  guide

## Why Include Pre-built Demos?

The walkerOS Docker image includes demos for optimal user experience:

- **Instant Testing**: Try walkerOS in 30 seconds without any setup
- **Working Examples**: See real event collection and tracking in action
- **No Bloat for Production**: 199MB image size is reasonable for cloud
  deployments
- **Onboarding**: New users can validate functionality immediately
- **Documentation**: Demos serve as executable documentation

The demos don't interfere with production usage - simply mount your own flow
bundle and the container ignores the demos entirely.

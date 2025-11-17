# WalkerOS Docker Demo Bundles

## Overview

This directory contains pre-built demo bundles for quickly testing walkerOS
Docker functionality. These bundles are **static files**, manually created from
CLI examples and committed to the repository.

## Available Demos

### demo-collect.mjs

**Purpose**: Minimal server-side event collection endpoint

**Source**: Built from `@walkeros/cli/examples/server-collect.json`

**What it does**:

- Starts Express server on configured port (default: 8080)
- Listens for POST requests at `/collect`
- Logs received events to console
- Returns `{"success": true}` response

**Usage**:

```bash
docker run -p 8080:8080 \
  -e MODE=collect \
  -e FLOW=/app/demos/demo-collect.mjs \
  walkeros/docker:latest
```

**Test**:

```bash
curl -X POST http://localhost:8080/collect \
  -H "Content-Type: application/json" \
  -d '{"name":"page view","data":{"title":"Test"}}'
```

### demo-serve.mjs

**Purpose**: Browser bundle that sends events to collector

**Source**: Built from `@walkeros/cli/examples/web-serve.json`

**What it does**:

- Serves a web bundle with walker.js
- Includes demo event source (generates automatic test events)
- Sends events to console (browser)
- Sends events to API destination at `http://localhost:8080/collect`

**Usage**:

```bash
docker run -p 3000:8080 \
  -e MODE=serve \
  -e FLOW=/app/demos/demo-serve.mjs \
  walkeros/docker:latest
```

**Access**: Open http://localhost:3000 in your browser

## Full Demo Loop

Run both demos together to see the complete event flow:

**Terminal 1 - Start Collector**:

```bash
docker run -p 8080:8080 \
  -e MODE=collect \
  -e FLOW=/app/demos/demo-collect.mjs \
  --name walker-collector \
  walkeros/docker:latest
```

**Terminal 2 - Start Web Serve**:

```bash
docker run -p 3000:8080 \
  -e MODE=serve \
  -e FLOW=/app/demos/demo-serve.mjs \
  --name walker-web \
  walkeros/docker:latest
```

**Test the Flow**:

1. Open http://localhost:3000 in your browser
2. Check browser console for walker events
3. Check Terminal 1 for collector receiving those events
4. Events flow: Browser → http://localhost:8080/collect → Console logs

**Cleanup**:

```bash
docker stop walker-collector walker-web
docker rm walker-collector walker-web
```

## How These Were Built

These bundles were manually created using the walkerOS CLI:

```bash
# Install CLI
npm install -g @walkeros/cli

# Bundle from JSON configs
walkeros bundle examples/server-collect.json -o server-collect.mjs
walkeros bundle examples/web-serve.json -o web-serve.mjs

# Copy to Docker package
cp server-collect.mjs packages/docker/demos/demo-collect.mjs
cp web-serve.mjs packages/docker/demos/demo-serve.mjs
```

## Creating Custom Bundles

To create your own bundles:

1. **Create flow config** (`my-flow.json`):

```json
{
  "flow": {
    "platform": "server",
    "sources": { ... },
    "destinations": { ... }
  },
  "build": {
    "packages": { ... },
    "output": "my-flow.mjs"
  }
}
```

2. **Bundle it**:

```bash
walkeros bundle my-flow.json
```

3. **Run with Docker**:

```bash
docker run -p 8080:8080 \
  -v $(pwd)/my-flow.mjs:/app/flow.mjs \
  -e MODE=collect \
  -e FLOW=/app/flow.mjs \
  walkeros/docker:latest
```

## Bundle Details

| File             | Size   | Dependencies                                                                                | Purpose                   |
| ---------------- | ------ | ------------------------------------------------------------------------------------------- | ------------------------- |
| demo-collect.mjs | ~54KB  | @walkeros/server-source-express, @walkeros/destination-demo                                 | Event collection endpoint |
| demo-serve.mjs   | ~376KB | @walkeros/web-source-demo, @walkeros/web-destination-console, @walkeros/web-destination-api | Browser event tracking    |

## Notes

- These bundles are **static files** committed to git
- They are NOT generated during Docker build
- They are version-controlled alongside the runtime code
- Update them manually when examples change (infrequent)
- Keep them minimal for quick startup and testing

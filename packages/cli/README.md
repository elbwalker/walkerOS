# @walkeros/cli

Command-line tools for building, testing, and running walkerOS event collection
flows.

## What is this?

The walkerOS CLI is a developer tool that:

- **Bundles** flow configurations into optimized JavaScript
- **Simulates** event processing for testing
- **Runs** flows locally without Docker daemon

Think of it as your development toolchain for walkerOS - from config to running
production bundles.

### When to Use the CLI

The CLI is for **Bundled mode** — when you want config-as-code and separate
deployment:

| Use CLI When                | Use Integrated Mode When |
| --------------------------- | ------------------------ |
| Static sites, landing pages | React/Next.js apps       |
| Docker/server deployments   | TypeScript projects      |
| CI/CD versioned configs     | Programmatic control     |
| Marketing/GTM workflows     | Build-time type safety   |

For Integrated mode (importing directly into your app), see the
[Collector package](../collector/).

## Installation

```bash
# Global (recommended for CLI usage)
npm install -g @walkeros/cli

# Local (for programmatic usage)
npm install @walkeros/cli
```

## Quick Start

```bash
# Bundle a flow configuration
walkeros bundle flow.json

# Test with simulated events (no real API calls)
walkeros simulate flow.json --event '{"name":"product view"}'

# Or test a pre-built bundle directly
walkeros simulate dist/bundle.mjs --event '{"name":"product view"}'

# Push real events to destinations
walkeros push flow.json --event '{"name":"product view"}'

# Run a collection server locally
walkeros run collect dist/bundle.mjs --port 3000
```

## Commands

### bundle

Generate optimized JavaScript bundles from flow configurations.

```bash
walkeros bundle <config-file> [options]
```

Config files can be local paths or HTTP(S) URLs:

```bash
walkeros bundle ./config.json                                    # Local file
walkeros bundle https://example.com/config.json                  # Remote URL
```

**Options:**

- `--flow <name>` - Flow name for multi-flow configs
- `--all` - Build all flows for multi-flow configs
- `--stats` - Show bundle statistics
- `--json` - Output as JSON (implies --stats)
- `--no-cache` - Disable package caching
- `--dockerfile [file]` - Generate Dockerfile (or copy custom file) to dist/
- `-v, --verbose` - Verbose output
- `-s, --silent` - Suppress output

**Examples:**

```bash
# Bundle with stats
walkeros bundle examples/server-collect.json --stats

# Bundle with auto-generated Dockerfile
walkeros bundle flow.json --dockerfile

# Bundle with custom Dockerfile
walkeros bundle flow.json --dockerfile Dockerfile.custom
```

The output path uses convention-based defaults: `./dist/bundle.mjs` for server,
`./dist/walker.js` for web. The `--dockerfile` flag generates a Dockerfile with
the correct `MODE` (collect/serve) based on flow type.

### simulate

Test event processing with simulated events. Accepts either a config JSON (which
gets bundled) or a pre-built bundle (executed directly).

```bash
walkeros simulate <input> --event '{"name":"page view"}' [options]
```

**Input types:**

- **Config JSON** - Bundled and executed with destination mocking
- **Pre-built bundle** (`.js`/`.mjs`) - Executed directly, no mocking

The CLI auto-detects the input type by attempting to parse as JSON.

**Options:**

- `-e, --event <json>` - Event to simulate (JSON string, file path, or URL)
- `--flow <name>` - Flow name for multi-flow configs
- `-p, --platform <platform>` - Platform override (`web` or `server`)
- `--json` - Output as JSON
- `-v, --verbose` - Verbose output
- `-s, --silent` - Suppress output

**Examples:**

```bash
# Simulate with config (auto-bundled)
walkeros simulate examples/web-serve.json \
  --event '{"name":"page view","data":{"title":"Home"}}' \
  --json

# Simulate specific flow from multi-flow config
walkeros simulate flow.json --flow server --event '{"name":"test"}'

# Simulate with pre-built bundle
walkeros simulate dist/bundle.mjs --event '{"name":"page view"}'

# Override platform detection
walkeros simulate dist/bundle.js --platform server --event '{"name":"page view"}'
```

**Platform detection:**

When using pre-built bundles, platform is detected from file extension:

- `.mjs` → server (ESM, Node.js)
- `.js` → web (IIFE, JSDOM)

Use `--platform` to override if extension doesn't match intended runtime.

### push

Execute your flow with real API calls to configured destinations. Unlike
`simulate` which mocks API calls, `push` performs actual HTTP requests. Accepts
either a config JSON (which gets bundled) or a pre-built bundle.

```bash
walkeros push <input> --event '<json>' [options]
```

**Input types:**

- **Config JSON** - Bundled and executed
- **Pre-built bundle** (`.js`/`.mjs`) - Executed directly

The CLI auto-detects the input type by attempting to parse as JSON.

**Options:**

- `-e, --event <source>` - Event to push (JSON string, file path, or URL)
  **Required**
- `--flow <name>` - Flow name (for multi-flow configs)
- `-p, --platform <platform>` - Platform override (`web` or `server`)
- `--json` - Output results as JSON
- `-v, --verbose` - Verbose output
- `-s, --silent` - Suppress output (for CI/CD)

**Event input formats:**

```bash
# Inline JSON
walkeros push flow.json --event '{"name":"page view","data":{"title":"Home"}}'

# File path
walkeros push flow.json --event ./events/order.json

# URL
walkeros push flow.json --event https://example.com/sample-event.json
```

**Bundle input:**

```bash
# Push with pre-built bundle
walkeros push dist/bundle.mjs --event '{"name":"order complete"}'

# Override platform detection
walkeros push dist/bundle.js --platform server --event '{"name":"order complete"}'
```

**Push vs Simulate:**

| Feature      | `push`                              | `simulate`         |
| ------------ | ----------------------------------- | ------------------ |
| API Calls    | Real HTTP requests                  | Mocked (captured)  |
| Use Case     | Integration testing                 | Safe local testing |
| Side Effects | Full (writes to DBs, sends to APIs) | None               |

Use `simulate` first to validate configuration safely, then `push` to verify
real integrations.

### run

Run flows locally (no Docker daemon required).

```bash
walkeros run <mode> <config-file> [options]
```

**Modes:**

- `collect` - HTTP event collection server
- `serve` - Static file server

**Options:**

- `-p, --port <number>` - Server port
- `-h, --host <host>` - Server host
- `--json` - Output as JSON
- `-v, --verbose` - Verbose output
- `-s, --silent` - Suppress output

**Examples:**

```bash
# Run collection server (auto-bundles JSON)
walkeros run collect examples/server-collect.json --port 3000

# Run with pre-built bundle
walkeros run collect examples/server-collect.mjs --port 3000

# Serve static files
walkeros run serve flow.json --port 8080 --static-dir ./dist
```

**How it works:**

1. JSON configs are auto-bundled to temp `.mjs`
2. `.mjs` bundles are used directly
3. Runs in current Node.js process
4. Press Ctrl+C for graceful shutdown

### deploy

Deploy flows to walkerOS cloud.

```bash
walkeros deploy start <flowId> [options]
walkeros deploy status <flowId> [options]
```

**Options:**

- `--project <id>` - Project ID (defaults to WALKEROS_PROJECT_ID)
- `--flow <name>` - Flow name for multi-config flows
- `--no-wait` - Do not wait for deployment to complete (start only)
- `--json` - Output as JSON
- `-v, --verbose` - Verbose output
- `-s, --silent` - Suppress output

**Examples:**

```bash
# Deploy a single-config flow
walkeros deploy start cfg_abc123

# Deploy a specific config from a multi-config flow
walkeros deploy start cfg_abc123 --flow web

# Check deployment status
walkeros deploy status cfg_abc123 --flow server
```

When a flow has multiple configs, the CLI requires `--flow <name>` to specify
which one to deploy. If omitted, the error message lists available names.

## Caching

The CLI implements intelligent caching for faster builds:

### Package Cache

- NPM packages are cached in `.tmp/cache/packages/`
- Mutable versions (`latest`, `^`, `~`) are re-checked daily
- Exact versions (`0.4.1`) are cached indefinitely

### Build Cache

- Compiled bundles are cached in `.tmp/cache/builds/`
- Cache key based on flow.json content + current date
- Identical configs reuse cached build within the same day

### Cache Management

```bash
# View cache info
walkeros cache info

# Clear all caches
walkeros cache clear

# Clear only package cache
walkeros cache clear --packages

# Clear only build cache
walkeros cache clear --builds

# Disable caching for a single build
walkeros bundle flow.json --no-cache
```

## Flow Configuration

Flow configs use the `Flow.Setup` format with `version` and `flows`:

```json
{
  "version": 1,
  "flows": {
    "default": {
      "server": {},
      "packages": {
        "@walkeros/collector": { "imports": ["startFlow"] },
        "@walkeros/server-source-express": {},
        "@walkeros/destination-demo": {}
      },
      "sources": {
        "http": {
          "package": "@walkeros/server-source-express",
          "config": {
            "settings": { "path": "/collect", "port": 8080 }
          }
        }
      },
      "destinations": {
        "demo": {
          "package": "@walkeros/destination-demo",
          "config": {
            "settings": { "name": "Demo" }
          }
        }
      },
      "collector": { "run": true }
    }
  }
}
```

Platform is determined by the `web: {}` or `server: {}` key presence.

### Package Configuration Patterns

The CLI automatically resolves imports based on how you configure packages:

**1. Default exports (recommended for single-export packages):**

```json
{
  "packages": {
    "@walkeros/server-destination-api": {}
  },
  "destinations": {
    "api": {
      "package": "@walkeros/server-destination-api"
    }
  }
}
```

The CLI generates:
`import _walkerosServerDestinationApi from '@walkeros/server-destination-api';`

**2. Named exports (for multi-export packages):**

```json
{
  "packages": {
    "@walkeros/server-destination-gcp": {}
  },
  "destinations": {
    "bigquery": {
      "package": "@walkeros/server-destination-gcp",
      "code": "destinationBigQuery"
    },
    "analytics": {
      "package": "@walkeros/server-destination-gcp",
      "code": "destinationAnalytics"
    }
  }
}
```

The CLI generates:
`import { destinationBigQuery, destinationAnalytics } from '@walkeros/server-destination-gcp';`

**3. Utility imports (for helper functions):**

```json
{
  "packages": {
    "lodash": { "imports": ["get", "set"] }
  },
  "mappings": {
    "custom": {
      "data": "({ data }) => get(data, 'user.email')"
    }
  }
}
```

The CLI generates: `import { get, set } from 'lodash';`

**Key points:**

- Omit `packages.imports` for destinations/sources - the default export is used
  automatically
- Only specify `code` when using a specific named export from a multi-export
  package
- Use `packages.imports` only for utilities needed in mappings or custom code

### Local Packages

Use local packages instead of npm for development or testing unpublished
packages:

```json
{
  "packages": {
    "@walkeros/collector": {
      "path": "../packages/collector",
      "imports": ["startFlow"]
    },
    "@my/custom-destination": {
      "path": "./my-destination",
      "imports": ["myDestination"]
    }
  }
}
```

**Resolution rules:**

- `path` takes precedence over `version`
- Relative paths are resolved from the config file's directory
- If `dist/` folder exists, it's used; otherwise package root is used

**Dependency resolution:**

When a local package has dependencies on other packages that are also specified
with local paths, the CLI will use the local versions for those dependencies
too. This prevents npm versions from overwriting your local packages.

```json
{
  "packages": {
    "@walkeros/core": {
      "path": "../packages/core",
      "imports": []
    },
    "@walkeros/collector": {
      "path": "../packages/collector",
      "imports": ["startFlow"]
    }
  }
}
```

In this example, even though `@walkeros/collector` depends on `@walkeros/core`,
the local version of core will be used (not downloaded from npm).

See [examples/](./examples/) for complete working configurations.

## Programmatic API

Use commands programmatically:

```typescript
import { bundle, simulate, runCommand } from '@walkeros/cli';

// Bundle
await bundle({
  config: './flow.json',
  stats: true,
});

// Simulate
const result = await simulate(
  './flow.json',
  { name: 'page view', data: { title: 'Test' } },
  { json: true },
);

// Run
await runCommand('collect', {
  config: './flow.json',
  port: 3000,
  verbose: true,
});
```

## Examples

Working example configs in [examples/](./examples/):

- **server-collect.json** - Basic server-side collection
- **server-collection.json** - Advanced server setup
- **web-serve.json** - Web demo with API destination
- **web-tracking.json** - General web tracking

Try them:

```bash
# Bundle example
walkeros bundle examples/server-collect.json --stats

# Simulate
walkeros simulate \
  examples/web-serve.json \
  --event '{"name":"product view","data":{"id":"P123"}}'

# Run server
walkeros run collect examples/server-collect.json --port 3000
```

## Development Workflow

Typical development cycle:

```bash
# 1. Create/edit config
vim my-flow.json

# 2. Test with simulation (no real API calls)
walkeros simulate \
  my-flow.json \
  --event '{"name":"product view"}' \
  --verbose

# 3. Bundle and check stats
walkeros bundle my-flow.json --stats

# 4. Run locally
walkeros run collect dist/bundle.mjs --port 3000

# 5. In another terminal, test it
curl -X POST http://localhost:3000/collect \
  -H "Content-Type: application/json" \
  -d '{"name":"page view","data":{"title":"Home"}}'
```

## Architecture

```
CLI (downloads packages + bundles with esbuild)
 ├─ Bundle → optimized .mjs file
 ├─ Simulate → test bundle with events
 └─ Run → execute bundle with built-in runtime
```

**Key principle**: CLI handles both build-time and runtime operations.

## Production Deployment

Deploy your flows using Docker or Node.js.

### Using Docker

The `walkeros/flow` image runs pre-built bundles in production:

```bash
# Build your flow with Dockerfile
walkeros bundle flow.json --dockerfile

# Deploy (e.g., to Cloud Run)
gcloud run deploy my-service --source ./dist
```

Or run locally:

```bash
docker run -v ./dist:/flow -p 8080:8080 walkeros/flow
```

**Custom Dockerfile:**

```bash
# Use a custom Dockerfile with extra packages or configuration
walkeros bundle flow.json --dockerfile Dockerfile.custom
```

**Environment variables:**

- `MODE` - `collect` or `serve` (default: `collect`)
- `PORT` - Server port (default: `8080`)
- `BUNDLE` - Bundle file path or URL (default: `/app/flow/bundle.mjs`). Also
  accepts stdin pipe: `cat flow.mjs | docker run -i walkeros/flow`

### Using Node.js

Run the bundle directly with the CLI:

```bash
# Build your flow
walkeros bundle flow.json

# Run in production
walkeros run collect dist/bundle.mjs --port 8080
```

This runs the flow in the current Node.js process, suitable for deployment on
platforms like AWS Lambda, Google Cloud Run, or any Node.js hosting.

## Requirements

- **Node.js**: 18+ or 22+
- **Docker**: Not required for CLI (only for production deployment)

## Type Definitions

See [src/types.ts](./src/types.ts) for TypeScript interfaces.

## Related

- [Website Documentation](https://www.walkeros.io/docs/apps/cli/)
- [Flow Configuration](https://www.walkeros.io/docs/getting-started/flow/)
- [Collector Package](../collector/) - For Integrated mode (direct imports)
- [Operating Modes](https://www.walkeros.io/docs/getting-started/modes/) -
  Choosing between Integrated and Bundled

## License

MIT © elbwalker

# @walkeros/cli

Command-line tools for building, testing, and running walkerOS event collection
flows.

## What is this?

The walkerOS CLI is a developer tool that:

- **Bundles** flow configurations into optimized JavaScript
- **Simulates** event processing for testing (via `push --simulate`)
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
walkeros push flow.json --event '{"name":"product view"}' --simulate destination.demo

# Push real events to destinations
walkeros push flow.json --event '{"name":"product view"}'

# Run a collection server locally
walkeros run dist/bundle.mjs --port 3000
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
`./dist/walker.js` for web.

### push

Execute your flow with real API calls, or simulate specific steps with
`--simulate`. Accepts either a config JSON (which gets bundled) or a pre-built
bundle.

```bash
walkeros push <input> --event '<json>' [options]
```

**Input types:**

- **Config JSON** - Bundled and executed
- **Pre-built bundle** (`.js`/`.mjs`) - Executed directly

The CLI auto-detects the input type by attempting to parse as JSON.

**Options:**

- `-e, --event <source>` - Event to push (JSON string, file path, or URL)
  **Required** (unless simulating a source)
- `--flow <name>` - Flow name (for multi-flow configs)
- `-p, --platform <platform>` - Platform override (`web` or `server`)
- `--simulate <step>` - Simulate a step (repeatable). Mocks the step's push,
  captures result. Use `destination.NAME` or `source.NAME`.
- `--mock <step=value>` - Mock a step with a specific return value (repeatable).
  Use `destination.NAME=VALUE`.
- `--snapshot <source>` - JS file to eval before execution. Sets global state
  (`window.dataLayer`, `process.env`, etc.).
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

**Simulation examples:**

```bash
# Simulate a destination (mock its push, capture API calls)
walkeros push flow.json -e event.json --simulate destination.ga4

# Simulate a source (capture events, disable all destinations)
walkeros push flow.json --simulate source.browser

# Mock a destination with a specific return value
walkeros push flow.json -e event.json --mock destination.ga4='{"status":"ok"}'
```

**Bundle input:**

```bash
# Push with pre-built bundle
walkeros push dist/bundle.mjs --event '{"name":"order complete"}'

# Override platform detection
walkeros push dist/bundle.js --platform server --event '{"name":"order complete"}'
```

**Push modes:**

| Mode | Flag | API Calls | Use Case |
| ---- | ---- | --------- | -------- |
| Real | (none) | Real HTTP requests | Integration testing |
| Simulate | `--simulate` | Mocked (captured) | Safe local testing |
| Mock | `--mock` | Returns mock value | Controlled testing |

Use `--simulate` first to validate safely, then push without flags for real
integrations.

### run

Run flows locally (no Docker daemon required).

```bash
walkeros run <config-file> [options]
```

**Options:**

- `-p, --port <number>` - Server port
- `-h, --host <host>` - Server host
- `--json` - Output as JSON
- `-v, --verbose` - Verbose output
- `-s, --silent` - Suppress output

**Examples:**

```bash
# Run collection server (auto-bundles JSON)
walkeros run examples/server-collect.json --port 3000

# Run with pre-built bundle
walkeros run examples/server-collect.mjs --port 3000
```

**How it works:**

1. JSON configs are auto-bundled to temp `.mjs`
2. `.mjs` bundles are used directly
3. Runs in current Node.js process
4. Press Ctrl+C for graceful shutdown

### validate

Validate flow configurations, events, mappings, or contracts.

```bash
walkeros validate <config-file> [options]
```

By default, validates a Flow.Config file — checking schema, references, and
cross-step example compatibility.

**Options:**

- `--type <type>` - Validation type (default: `flow`). Also accepts: `event`,
  `mapping`, `contract`
- `--path <path>` - Validate a specific entry against its package schema (e.g.,
  `destinations.snowplow`, `sources.browser`)
- `--flow <name>` - Flow name for multi-flow configs
- `--strict` - Treat warnings as errors
- `--json` - Output as JSON
- `-v, --verbose` - Verbose output
- `-s, --silent` - Suppress output

**Exit codes:** `0` = valid, `1` = errors, `2` = warnings (with --strict), `3` =
input error

**Examples:**

```bash
# Validate flow config (schema + examples)
walkeros validate flow.json

# Validate specific flow
walkeros validate flow.json --flow analytics

# Validate a single event
walkeros validate event.json --type event

# Validate in CI
walkeros validate flow.json --json --strict || exit 1

# Validate entry against package schema
walkeros validate flow.json --path destinations.snowplow
```

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

Flow configs use the `Flow.Config` format with `version` and `flows`:

```json
{
  "version": 3,
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
import { bundle, push, runCommand } from '@walkeros/cli';

// Bundle
await bundle({
  config: './flow.json',
  stats: true,
});

// Push with simulation
const result = await push(
  './flow.json',
  { name: 'page view', data: { title: 'Test' } },
  { simulate: ['destination.ga4'], json: true },
);
// result.usage = API call tracking data

// Push for real
await push(
  './flow.json',
  { name: 'page view', data: { title: 'Test' } },
);

// Run
await runCommand({
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
walkeros push \
  examples/web-serve.json \
  --event '{"name":"product view","data":{"id":"P123"}}' \
  --simulate destination.demo

# Run server
walkeros run examples/server-collect.json --port 3000
```

## Development Workflow

Typical development cycle:

```bash
# 1. Create/edit config
vim my-flow.json

# 2. Test with simulation (no real API calls)
walkeros push \
  my-flow.json \
  --event '{"name":"product view"}' \
  --simulate destination.demo \
  --verbose

# 3. Bundle and check stats
walkeros bundle my-flow.json --stats

# 4. Run locally
walkeros run dist/bundle.mjs --port 3000

# 5. In another terminal, test it
curl -X POST http://localhost:3000/collect \
  -H "Content-Type: application/json" \
  -d '{"name":"page view","data":{"title":"Home"}}'
```

## Architecture

```
CLI (downloads packages + bundles with esbuild)
 ├─ Bundle → optimized .mjs file
 ├─ Push → execute bundle (with optional --simulate for testing)
 └─ Run → execute bundle with built-in runtime
```

**Key principle**: CLI handles both build-time and runtime operations.

## Runner (Docker)

The `walkeros/flow` Docker image is a self-bundling runner for production
deployment. It supports four deployment modes — from fully local to fully
managed — all using the same image and config format.

```bash
# Mode A: Local only — no signup, no API
docker run -v ./flow.json:/app/flow.json -e BUNDLE=/app/flow.json walkeros/flow

# Mode B: Local config + dashboard visibility
docker run -v ./flow.json:/app/flow.json \
  -e BUNDLE=/app/flow.json \
  -e WALKEROS_TOKEN=sk-walkeros-xxx \
  -e PROJECT_ID=proj_xxx \
  walkeros/flow

# Mode C: Remote config with hot-swap
docker run \
  -e WALKEROS_TOKEN=sk-walkeros-xxx \
  -e PROJECT_ID=proj_xxx \
  -e FLOW_ID=flow_xxx \
  walkeros/flow
```

Each step adds one env var. Same runner, same config, same bundle pipeline.

See the [Runner documentation](https://www.walkeros.io/docs/apps/runner/) for
the full reference (env vars, pipeline, caching, hot-swap, health checks,
troubleshooting).

### Using Node.js

Run the bundle directly with the CLI:

```bash
# Build your flow
walkeros bundle flow.json

# Run in production
walkeros run dist/bundle.mjs --port 8080
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
- [Runner Documentation](https://www.walkeros.io/docs/apps/runner/) -
  Self-hosted runner with config polling and hot-swap
- [Docker Runtime](https://www.walkeros.io/docs/apps/docker/) - Pre-built bundle
  deployment
- [Flow Configuration](https://www.walkeros.io/docs/getting-started/flow/)
- [Collector Package](../collector/) - For Integrated mode (direct imports)
- [Operating Modes](https://www.walkeros.io/docs/getting-started/modes/) -
  Choosing between Integrated and Bundled

## License

MIT © elbwalker

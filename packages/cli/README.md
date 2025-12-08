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
walkeros simulate flow.json --event '{"name":"page view"}'

# Push real events to destinations
walkeros push flow.json --event '{"name":"page view"}'

# Run a collection server locally
walkeros run collect flow.json --port 3000
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

- `-f, --flow <name>` - Build specific flow (multi-flow configs)
- `--all` - Build all flows
- `-s, --stats` - Show bundle statistics
- `--json` - Output stats as JSON
- `--no-cache` - Disable package caching
- `--local` - Run locally without Docker
- `-v, --verbose` - Verbose output

**Example:**

```bash
# Bundle with stats
walkeros bundle examples/server-collect.json --stats
```

The output path uses convention-based defaults: `./dist/bundle.mjs` for server,
`./dist/walker.js` for web.

### simulate

Test event processing with simulated events.

```bash
walkeros simulate <config-file> --event '{"name":"page view"}' [options]
```

**Options:**

- `-e, --event <json>` - Event JSON string (required)
- `--json` - Output results as JSON
- `--local` - Run locally without Docker
- `-v, --verbose` - Verbose output

**Example:**

```bash
# Simulate page view
walkeros simulate \
  examples/web-serve.json \
  --event '{"name":"page view","data":{"title":"Home"}}' \
  --json
```

### push

Execute your flow with real API calls to configured destinations. Unlike
`simulate` which mocks API calls, `push` performs actual HTTP requests.

```bash
walkeros push <config-file> --event '<json>' [options]
```

**Options:**

- `-e, --event <source>` - Event to push (JSON string, file path, or URL)
  **Required**
- `--flow <name>` - Flow name (for multi-flow configs)
- `--json` - Output results as JSON
- `-v, --verbose` - Verbose output
- `-s, --silent` - Suppress output (for CI/CD)
- `--local` - Execute locally without Docker

**Event input formats:**

```bash
# Inline JSON
walkeros push flow.json --event '{"name":"page view","data":{"title":"Home"}}'

# File path
walkeros push flow.json --event ./events/order.json

# URL
walkeros push flow.json --event https://example.com/sample-event.json
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

Run flows locally using @walkeros/docker as a library (no Docker daemon
required).

```bash
walkeros run <mode> <config-file> [options]
```

**Modes:**

- `collect` - HTTP event collection server
- `serve` - Static file server

**Options:**

- `-p, --port <number>` - Server port
- `-h, --host <host>` - Server host
- `--static-dir <dir>` - Static directory (serve mode)
- `--local` - Run locally without Docker
- `--json` - JSON output
- `-v, --verbose` - Verbose output

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

1. JSON configs are bundled to temp `.mjs` automatically
2. `.mjs` bundles are used directly
3. Runs in current Node.js process (no containers)
4. Press Ctrl+C for graceful shutdown

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

# 2. Bundle and check stats
walkeros bundle my-flow.json --stats

# 3. Test with simulation
walkeros simulate \
  my-flow.json \
  --event '{"name":"test event"}' \
  --verbose

# 4. Run locally
walkeros run collect my-flow.json --port 3000

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
 └─ Run → import @walkeros/docker + execute bundle
```

**Key principle**: CLI handles build-time, Docker handles runtime.

## Docker Images

By default, CLI uses **explicit version tags** (not `:latest`):

- `walkeros/cli:0.3.5` - Build tools (bundle, simulate)
- `walkeros/docker:0.1.4` - Production runtime

Override with environment variables:

```bash
export WALKEROS_CLI_DOCKER_IMAGE=walkeros/cli:0.3.4
export WALKEROS_RUNTIME_DOCKER_IMAGE=walkeros/docker:latest
walkeros bundle config.json
```

## Requirements

- **Node.js**: 18+ or 22+
- **Docker**: Not required for CLI (only for production deployment)

## Documentation

Detailed guides in [docs/](./docs/):

- [RUN_COMMAND.md](./docs/RUN_COMMAND.md) - Run command details
- [PUBLISHING.md](./docs/PUBLISHING.md) - Publishing guide
- [MANUAL_TESTING_GUIDE.md](./docs/MANUAL_TESTING_GUIDE.md) - Testing guide

## Type Definitions

See [src/types.ts](./src/types.ts) for TypeScript interfaces.

## Related

- [Website Documentation](https://www.walkeros.io/docs/cli/)
- [Flow Configuration](https://www.walkeros.io/docs/getting-started/flow/)
- [Docker Package](../docker/) - Production runtime

## License

MIT © elbwalker

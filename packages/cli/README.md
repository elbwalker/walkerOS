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

## Commands

### bundle

Generate optimized JavaScript bundles from flow configurations.

```bash
walkeros bundle --config flow.json [options]
```

**Options:**

- `-c, --config <path>` - Flow configuration file (required)
- `-e, --env <name>` - Build specific environment (multi-env configs)
- `--all` - Build all environments
- `-s, --stats` - Show bundle statistics
- `--json` - Output stats as JSON
- `--no-cache` - Disable package caching
- `-v, --verbose` - Verbose output

**Example:**

```bash
# Bundle with stats
walkeros bundle --config examples/server-collect.json --stats
```

The output path is specified in the config's `build.output` field.

### simulate

Test event processing with simulated events.

```bash
walkeros simulate --config flow.json --event '{"name":"page view"}' [options]
```

**Options:**

- `-c, --config <path>` - Bundle configuration file (required)
- `-e, --event <json>` - Event JSON string (required)
- `--json` - Output results as JSON
- `-v, --verbose` - Verbose output

**Example:**

```bash
# Simulate page view
walkeros simulate \
  --config examples/web-serve.json \
  --event '{"name":"page view","data":{"title":"Home"}}' \
  --json
```

### run

Run flows locally using @walkeros/docker as a library (no Docker daemon
required).

```bash
walkeros run <mode> --config <path> [options]
```

**Modes:**

- `collect` - HTTP event collection server
- `serve` - Static file server

**Options:**

- `-c, --config <path>` - Flow config (.json) or bundle (.mjs)
- `-p, --port <number>` - Server port
- `-h, --host <host>` - Server host
- `--static-dir <dir>` - Static directory (serve mode)
- `--json` - JSON output
- `-v, --verbose` - Verbose output

**Examples:**

```bash
# Run collection server (auto-bundles JSON)
walkeros run collect --config examples/server-collect.json --port 3000

# Run with pre-built bundle
walkeros run collect --config examples/server-collect.mjs --port 3000

# Serve static files
walkeros run serve --config flow.json --port 8080 --static-dir ./dist
```

**How it works:**

1. JSON configs are bundled to temp `.mjs` automatically
2. `.mjs` bundles are used directly
3. Runs in current Node.js process (no containers)
4. Press Ctrl+C for graceful shutdown

## Flow Configuration

Minimal example:

```json
{
  "flow": {
    "platform": "server",
    "sources": {
      "http": {
        "code": "sourceExpress",
        "config": {
          "settings": {
            "path": "/collect",
            "port": 8080
          }
        }
      }
    },
    "destinations": {
      "demo": {
        "code": "destinationDemo",
        "config": {
          "settings": {
            "name": "Demo"
          }
        }
      }
    },
    "collector": {
      "run": true
    }
  },
  "build": {
    "packages": {
      "@walkeros/collector": {
        "version": "latest",
        "imports": ["startFlow"]
      },
      "@walkeros/server-source-express": {
        "version": "latest",
        "imports": ["sourceExpress"]
      },
      "@walkeros/destination-demo": {
        "version": "latest",
        "imports": ["destinationDemo"]
      }
    },
    "code": "// Custom code here\n",
    "output": "bundle.mjs",
    "template": "./templates/base.hbs"
  }
}
```

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
walkeros bundle --config examples/server-collect.json --stats

# Simulate
walkeros simulate \
  --config examples/web-serve.json \
  --event '{"name":"product view","data":{"id":"P123"}}'

# Run server
walkeros run collect --config examples/server-collect.json --port 3000
```

## Development Workflow

Typical development cycle:

```bash
# 1. Create/edit config
vim my-flow.json

# 2. Bundle and check stats
walkeros bundle --config my-flow.json --stats

# 3. Test with simulation
walkeros simulate \
  --config my-flow.json \
  --event '{"name":"test event"}' \
  --verbose

# 4. Run locally
walkeros run collect --config my-flow.json --port 3000

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

## Requirements

- **Node.js**: 18+ or 22+
- **Docker**: Not required for CLI (only for production deployment)

## Documentation

Detailed guides in [docs/](./docs/):

- [RUN_COMMAND.md](./docs/RUN_COMMAND.md) - Run command details
- [PUBLISHING.md](./docs/PUBLISHING.md) - Publishing guide
- [MANUAL_TESTING_GUIDE.md](./docs/MANUAL_TESTING_GUIDE.md) - Testing guide

## License

MIT © elbwalker

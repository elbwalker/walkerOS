# CLI Commands Reference

Detailed reference for all walkerOS CLI commands.

---

## bundle

Generate optimized JavaScript bundles from Flow.Setup configurations.

### Usage

```bash
walkeros bundle <config> [options]
```

### Options

| Option          | Description                               |
| --------------- | ----------------------------------------- |
| `--flow <name>` | Bundle specific flow (default: "default") |
| `--all`         | Bundle all flows in config                |
| `--stats`       | Show bundle size statistics               |
| `--json`        | Output results as JSON                    |
| `--no-cache`    | Skip build cache                          |
| `--dockerfile`  | Generate Dockerfile for deployment        |
| `-v, --verbose` | Verbose logging                           |
| `-s, --silent`  | Silent mode (errors only)                 |

### Output

- **Web flows**: `./dist/walker.js`
- **Server flows**: `./dist/bundle.mjs`

### Examples

```bash
# Bundle default flow
walkeros bundle flow.json

# Bundle specific flow
walkeros bundle flow.json --flow analytics

# Bundle all flows with stats
walkeros bundle flow.json --all --stats

# Generate Docker deployment
walkeros bundle flow.json --dockerfile
```

---

## simulate

Test event processing with mocked API calls (no real side effects).

### Usage

```bash
walkeros simulate <config|bundle> [options]
```

### Options

| Option                  | Description                             |
| ----------------------- | --------------------------------------- |
| `-e, --event <source>`  | Event as JSON string, file path, or URL |
| `--flow <name>`         | Flow to simulate                        |
| `-p, --platform <type>` | Platform: "web" or "server"             |
| `--json`                | JSON output                             |
| `-v, --verbose`         | Verbose logging                         |
| `-s, --silent`          | Silent mode                             |

### Input Types

1. **JSON config** - Bundles then simulates
2. **Pre-built bundle** - Executes directly

### Event Sources

```bash
# Inline JSON
walkeros simulate flow.json -e '{"entity":"page","action":"view"}'

# File path
walkeros simulate flow.json -e ./events/pageview.json

# URL
walkeros simulate flow.json -e https://example.com/event.json
```

### Examples

```bash
# Simulate with inline event
walkeros simulate flow.json -e '{"entity":"product","action":"add","data":{"id":"123"}}'

# Simulate pre-built bundle
walkeros simulate dist/bundle.mjs -e event.json

# Verbose output for debugging
walkeros simulate flow.json -e event.json -v
```

---

## push

Execute flow with real API calls (actual side effects).

### Usage

```bash
walkeros push <config|bundle> [options]
```

### Options

| Option                  | Description                                  |
| ----------------------- | -------------------------------------------- |
| `-e, --event <source>`  | Event (required) - JSON string, file, or URL |
| `--flow <name>`         | Flow to use                                  |
| `-p, --platform <type>` | Platform override                            |
| `--json`                | JSON output                                  |
| `-v, --verbose`         | Verbose logging                              |

**Warning:** This makes real API calls. Use `simulate` first to test.

### Examples

```bash
# Push event to production destinations
walkeros push flow.json -e '{"entity":"order","action":"complete"}'

# Push from file
walkeros push flow.json -e ./events/purchase.json
```

---

## run

Run flows locally without Docker.

### Subcommands

#### run collect

HTTP event collection server for server-side flows.

```bash
walkeros run collect <config|bundle> [options]

Options:
  -p, --port <number>   Port (default: 3000)
  -h, --host <string>   Host (default: localhost)
```

#### run serve

Static file server for browser bundles.

```bash
walkeros run serve <config|bundle> [options]

Options:
  -p, --port <number>   Port (default: 8080)
  -h, --host <string>   Host (default: localhost)
```

### Examples

```bash
# Start collection server
walkeros run collect flow.json --port 3000

# Serve browser bundle
walkeros run serve flow.json --port 8080

# Use pre-built bundle
walkeros run collect dist/bundle.mjs
```

---

## deploy

Deploy flows to walkerOS cloud. Auto-detects web (CDN hosting) or server
(container) from the flow config.

### Subcommands

| Subcommand | Purpose                          |
| ---------- | -------------------------------- |
| `start`    | Deploy a flow (streams progress) |
| `status`   | Get deployment details           |
| `list`     | List all deployments             |
| `create`   | Create a deployment record       |
| `delete`   | Delete a deployment              |

### deploy start

```bash
walkeros deploy start <flowId> [options]
```

| Option              | Description                                  |
| ------------------- | -------------------------------------------- |
| `--project <id>`    | Project ID (defaults to WALKEROS_PROJECT_ID) |
| `-f, --flow <name>` | Flow name for multi-config flows             |
| `--no-wait`         | Return immediately without streaming         |
| `--timeout <sec>`   | Timeout in seconds (default: 120)            |
| `--json`            | JSON output                                  |
| `-v, --verbose`     | Verbose logging                              |
| `-s, --silent`      | Silent mode                                  |

Progress is streamed via SSE:

```
Building bundle...
Deploying container...
Starting container...
✓ Active: https://collect-abc123.walkeros.io
```

For multi-config flows, use `--flow` to specify which config to deploy. Without
it, the command errors with the available config names.

### deploy status

```bash
walkeros deploy status <id-or-slug> [options]
```

| Option           | Description |
| ---------------- | ----------- |
| `--project <id>` | Project ID  |
| `--json`         | JSON output |

### deploy list

```bash
walkeros deploy list [options]
```

| Option              | Description                 |
| ------------------- | --------------------------- |
| `--project <id>`    | Project ID                  |
| `--type <type>`     | Filter: `web` or `server`   |
| `--status <status>` | Filter by deployment status |
| `--json`            | JSON output                 |

### deploy delete

```bash
walkeros deploy delete <id-or-slug> [options]
```

### Examples

```bash
# Deploy a flow and watch progress
walkeros deploy start flow_abc123

# Deploy specific config from multi-config flow
walkeros deploy start flow_abc123 --flow production

# Deploy without waiting
walkeros deploy start flow_abc123 --no-wait

# Check status later
walkeros deploy status dep_xyz789

# List server deployments
walkeros deploy list --type server
```

### Prerequisites

- **Authentication:** Set `WALKEROS_TOKEN` env var or run `walkeros auth`
- **Project:** Set `WALKEROS_PROJECT_ID` or use `--project`
- **Flow must exist:** Create via the app UI or API first
- **Server flows need an HTTP source** with `port` setting for health checks

---

## validate

Validate events, flows, or mapping configurations.

### Usage

```bash
walkeros validate <type> [input] [options]
```

Where `<type>` is one of: `event`, `flow`, or `mapping`.

### Options

| Option          | Description                      |
| --------------- | -------------------------------- |
| `--flow <name>` | Flow name for multi-flow configs |
| `--strict`      | Treat warnings as errors         |
| `--json`        | JSON output                      |
| `-v, --verbose` | Verbose output                   |
| `-s, --silent`  | Suppress output                  |

### Exit Codes

| Code | Meaning                            |
| ---- | ---------------------------------- |
| 0    | Valid                              |
| 1    | Errors found                       |
| 2    | Warnings found (with --strict)     |
| 3    | Input error (file not found, etc.) |

### Examples

```bash
# Validate flow config
walkeros validate flow flow.json

# Validate event structure
walkeros validate event event.json

# Validate mapping configuration
walkeros validate mapping mapping.json

# Validate specific flow in multi-flow config
walkeros validate flow flow.json --flow analytics

# Strict validation (warnings = errors)
walkeros validate flow flow.json --strict

# CI/CD integration
walkeros validate flow flow.json --json || exit 1
```

---

## cache

Manage CLI caching for packages and builds.

### Subcommands

#### cache clear

Clear all cached packages and builds.

```bash
walkeros cache clear
```

#### cache info

Show cache statistics.

```bash
walkeros cache info
```

### Caching Behavior

- **Packages**: Daily cache for mutable versions, indefinite for exact versions
- **Builds**: Keyed by content hash + date

### When to Clear Cache

- After updating local packages
- When experiencing stale bundle issues
- After npm package updates

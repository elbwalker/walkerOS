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

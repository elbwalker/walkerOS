# CLI Commands Reference

Detailed reference for all walkerOS CLI commands.

---

## bundle

Generate optimized JavaScript bundles from Flow.Config configurations.

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

By default, the bundle is written to stdout. Use `-o` to write to a file:

- **Web flows**: `-o ./dist/walker.js`
- **Server flows**: `-o ./dist/bundle.mjs`

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

## push

Execute flow with real API calls, or simulate specific steps with `--simulate`.

### Usage

```bash
walkeros push <config|bundle> [options]
```

### Options

| Option                  | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `-e, --event <source>`  | Event (required) - JSON string, file, or URL                          |
| `--flow <name>`         | Flow to use                                                           |
| `-p, --platform <type>` | Platform override                                                     |
| `--simulate <step>`     | Simulate a step (repeatable). Use `destination.NAME` or `source.NAME` |
| `--mock <step=value>`   | Mock a step with a specific return value (repeatable)                 |
| `--snapshot <source>`   | JS file to eval before execution (sets global state)                  |
| `--json`                | JSON output                                                           |
| `-v, --verbose`         | Verbose logging                                                       |

**Without `--simulate`:** Makes real API calls. Test with `--simulate` first.

### Examples

```bash
# Push event to production destinations
walkeros push flow.json -e '{"entity":"order","action":"complete"}'

# Push from file
walkeros push flow.json -e ./events/purchase.json

# Simulate a destination (mock its push, capture API calls)
walkeros push flow.json -e event.json --simulate destination.ga4

# Simulate a source (capture events, disable all destinations)
walkeros push flow.json --simulate source.browser

# Mock a destination with a specific return value
walkeros push flow.json -e event.json --mock destination.ga4='{"status":"ok"}'

# Combine simulation flags
walkeros push flow.json -e event.json --simulate destination.ga4 --mock destination.piwik='null'
```

---

## run

Run flows locally without Docker.

### Usage

```bash
walkeros run <config|bundle> [options]

Options:
  -p, --port <number>   Port (default: 8080)
  -h, --host <string>   Host (default: localhost)
```

### Examples

```bash
# Start collection server
walkeros run flow.json --port 3000

# Use pre-built bundle
walkeros run dist/bundle.mjs
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

## previews

Manage preview bundles — short-lived flow bundles used to test configuration
changes on a real production site before deploying. Each preview has a token;
visiting any page of your site with `?elbPreview={token}` activates preview mode
for that browser (7-day cookie, 30-day CDN bundle). The production walker
self-heals on a deleted preview by clearing the cookie and loading production.

### Subcommands

| Subcommand | Purpose                                     |
| ---------- | ------------------------------------------- |
| `list`     | List previews for a flow                    |
| `get`      | Get a single preview's details              |
| `create`   | Create a preview bundle for a flow settings |
| `delete`   | Delete a preview (DB row + CDN bundle)      |

### previews list

```bash
walkeros previews list <flowId> [--project <projectId>]
```

### previews get

```bash
walkeros previews get <flowId> <previewId> [--project <projectId>]
```

### previews create

```bash
walkeros previews create <flowId> [options]
```

| Option                   | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| `-f, --flow <name>`      | Flow settings name (resolved to an ID)                |
| `-s, --settings-id <id>` | Flow settings ID (alternative to `--flow`)            |
| `-u, --url <siteUrl>`    | Your site URL; prints a full activation URL on stdout |
| `--project <id>`         | Project ID (overrides default)                        |

Without `--url`, stdout contains the activation fragment (`?elbPreview=...`) to
append to any URL on your site. With `--url`, stdout contains the complete
`{url}?elbPreview={token}` URL plus a deactivation URL on stderr.

### previews delete

```bash
walkeros previews delete <flowId> <previewId> [options]
```

| Option           | Description                                           |
| ---------------- | ----------------------------------------------------- |
| `-y, --yes`      | Skip confirmation (required to run non-interactively) |
| `--project <id>` | Project ID (overrides default)                        |

### Example

```bash
# Create a preview for the `demo` flow settings with a full activation URL
walkeros previews create flow_abc123 \
  --flow demo \
  --url https://example.com

# List previews
walkeros previews list flow_abc123

# Delete when done
walkeros previews delete flow_abc123 prv_xyz456 --yes
```

### Prerequisites

- **Authentication:** `WALKEROS_TOKEN` env var or `walkeros auth`
- **Project:** `WALKEROS_PROJECT_ID` or `--project`
- **Target site** must be running a walkerOS-built `walker.js` with the preview
  preflight baked in (all bundles from `@walkeros/cli >= 3.0` include it)

---

## validate

Validate flow configurations, events, mappings, or contracts.

### Usage

```bash
walkeros validate <input> [options]
```

Default: validates input as Flow.Config (schema, references, cross-step
examples).

### Options

| Option          | Description                                                          |
| --------------- | -------------------------------------------------------------------- |
| `--type <type>` | Validation type (default: `flow`). See types below.                  |
| `--path <path>` | Validate entry against package schema (e.g. `destinations.snowplow`) |
| `--flow <name>` | Flow name for multi-flow configs                                     |
| `--strict`      | Treat warnings as errors                                             |
| `--json`        | JSON output                                                          |
| `-v, --verbose` | Verbose output                                                       |
| `-s, --silent`  | Suppress output                                                      |

### Validation types

| Type             | Input        | What it checks                          |
| ---------------- | ------------ | --------------------------------------- |
| `flow` (default) | Flow.Config  | Schema, references, cross-step examples |
| `event`          | Event object | Name format, schema, consent            |
| `mapping`        | Mapping      | Pattern format, rule structure          |
| `contract`       | Contract     | Named entries, extends, sections        |

Use `--path` for entry validation against package schemas:

```bash
walkeros validate flow.json --path destinations.snowplow
walkeros validate flow.json --path sources.browser
```

### Exit codes

| Code | Meaning                            |
| ---- | ---------------------------------- |
| 0    | Valid                              |
| 1    | Errors found                       |
| 2    | Warnings found (with --strict)     |
| 3    | Input error (file not found, etc.) |

### Examples

```bash
# Validate flow config (full check)
walkeros validate flow.json

# Validate specific flow
walkeros validate flow.json --flow analytics

# Validate a single event
walkeros validate event.json --type event

# Validate mapping
walkeros validate mapping.json --type mapping

# Validate entry against package schema
walkeros validate flow.json --path destinations.snowplow

# CI/CD
walkeros validate flow.json --json --strict || exit 1
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

# CLI Commands Reference

Detailed reference for all walkerOS CLI commands.

---

## bundle

Generate optimized JavaScript bundles from Flow.Json configurations.

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
| `-v, --verbose` | Verbose logging                           |
| `-s, --silent`  | Silent mode (errors only)                 |

### Output

By default, web bundles are written to stdout. Use `-o`:

- **Web flows**: `-o ./dist/walker.js` (single self-contained IIFE)
- **Server flows**: `-o ./dist/` (a directory: `flow.mjs`, `package.json`,
  `node_modules/` -- nft-traced)

### Examples

```bash
# Bundle default flow (web → stdout, server → write -o)
walkeros bundle flow.json

# Bundle a server flow into dist/
walkeros bundle flow.json -o dist/

# Bundle specific flow
walkeros bundle flow.json --flow analytics

# Bundle all flows with stats (writes dist/<flowName>/...)
walkeros bundle flow.json --all --stats -o dist/
```

---

## push

Execute flow with real API calls, or simulate specific steps with `--simulate`.

### Usage

```bash
walkeros push <config|bundle> [options]
```

### Options

| Option                  | Description                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `-e, --event <source>`  | Event (required) - JSON string, file, or URL                                                                                           |
| `--flow <name>`         | Flow to use                                                                                                                            |
| `-p, --platform <type>` | Platform override                                                                                                                      |
| `--simulate <step>`     | Simulate a step (repeatable for `destination.*`). Format: `source.NAME` \| `destination.NAME` \| `transformer.NAME`. Bare names error. |
| `--mock <step=value>`   | Mock a step with a specific return value (repeatable)                                                                                  |
| `--snapshot <source>`   | JS file to eval before execution (sets global state)                                                                                   |
| `--json`                | JSON output                                                                                                                            |
| `-v, --verbose`         | Verbose logging                                                                                                                        |

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

# Multi-target destination simulate (one flag per destination)
walkeros push flow.json -e event.json --simulate destination.ga4 --simulate destination.meta
```

### `--simulate` rules

- Format is `<type>.<name>`. Bare names (`--simulate ga4`) error with
  `Invalid step format` and never bundle.
- `--simulate destination.*` is repeatable; every named destination is mocked,
  all others disabled.
- `--simulate source.*` and `--simulate transformer.*` are single-target.
  Multiple flags of those types error.
- All flags in one invocation must target the same type (no mixing
  destination/source/transformer).

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

# Use pre-built server bundle (the entry inside dist/)
walkeros run dist/flow.mjs
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
| `--timeout <sec>`   | Override the wait budget (default: 12 min)   |
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

Manage preview bundles: short-lived flow bundles used to test configuration
changes on a real production site before deploying. Creating a preview mints an
app-signed, origin-bound activation grant (30-day CDN bundle); visiting any page
of your site with `?elbPreview={grant}` verifies the grant locally and activates
preview mode for that browser, for the life of the preview session. The
production walker self-heals on a deleted preview by clearing the stored grant
and loading production.

A managed bundle that supports preview activation is built with the wrap step's
`preview` option (public keyring + issuer + opaque project binding); the emitted
bundle imports `browserSwapActivator` from `@walkeros/core` to verify and swap
in the preview artifact. `preview` replaces the earlier `previewOrigin` /
`previewScope` wrap options. A companion `previewGrantTargets` option exists for
the preview artifact itself: it forwards the stored grant as an
`X-Walkeros-Preview` header to named server-bound destinations, so a server flow
can be previewed too. `preview` and `previewGrantTargets` are mutually exclusive
on a single wrap invocation: a host bundle activates a preview, a preview
artifact injects its grant, not both.

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

The human-readable summary (preview id, creator, bundle URL, activate and
deactivate lines) goes to stderr; stdout carries only the machine-readable
activation URL. Activation URLs are always app-minted and origin-bound, so the
CLI never builds one client-side (the API response carries no raw token to build
one from). With `--url`, the grant is minted for that origin: stdout is the full
activation URL, and stderr includes a `?elbPreview=off` deactivation URL.
Without `--url`, the server may not have minted a grant for any site yet; stdout
is then empty and the summary points at re-running with `--url`.

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

## observe

Start a live observation session for a flow and print the attach info for both
arms: the web activation link and the server environment trio. The session is
minted via the app's authenticated boundary; the mint response usually comes
back `arming`, so the command polls until the session settles (or `--no-wait`
skips the wait).

### observe start

```bash
walkeros observe start <flowId> [options]
```

| Option                | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `-f, --flow <name>`   | Flow settings name (auto-resolved when the flow has exactly one) |
| `--project <id>`      | Project ID (overrides default)                                   |
| `--level <level>`     | Observation detail level: `off`, `standard`, or `trace`          |
| `--replace`           | Replace an existing active session for this flow                 |
| `--no-wait`           | Do not wait for the session to settle                            |
| `--timeout <seconds>` | Seconds to wait for the session to settle (default: 300)         |
| `--json`              | Output the raw session as JSON                                   |

### Output

The human-readable session report goes to stderr; stdout carries only the live
server endpoint (when armed) for scripting:

```
Observe session ses_abc123 (live)

  Web
    Bundle URL: https://cdn.test/preview/proj_test/walker.k9x2m4p7abcd.js
    Credential: obsw_pb1.ses_abc123.webtok
    Activate:   https://shop.example/?elbPreview=eyJncjRudA.gr4nt.s1g&elbObserve=obsw_pb1.ses_abc123.webtok

  Server
    Flow:       server
    Endpoint:   https://obs-ses-abc123.containers.test
    Env:
      WALKEROS_OBSERVER_URL=https://observer.test
      WALKEROS_DEPLOYMENT_ID=ses_abc123
      WALKEROS_INGEST_TOKEN=srv_ingest_tok

  Expires:  2026-07-19T00:00:00.000Z
  Records:  42

  The session lives server-side; closing this terminal does not end it.
  Sessions idle out server-side when no tab or traffic keeps them alive.
```

### Semantics

- **Activation URL is app-minted.** Grants are app-signed and origin-bound, and
  the link already carries the `elbObserve` credential companion, so the
  observed tab picks up the session credential from the link itself. The CLI
  echoes the URL verbatim and never builds one client-side. When no link is
  minted yet, the report says so; when the deployed web bundle cannot verify
  grants, it points at redeploying the web flow first.
- **The env trio is the session's identity.** Export `WALKEROS_OBSERVER_URL`,
  `WALKEROS_DEPLOYMENT_ID`, and `WALKEROS_INGEST_TOKEN` into a server runtime
  (read via `observeFromEnv`) to feed that exact session.
- **Waiting heartbeats the session.** Each poll tick also POSTs the session
  heartbeat so the idle reaper cannot claim the session while you set up.
  Heartbeats extend grace, never gate: failures are swallowed, and session
  liveness never depends on this process.
- **Sessions are server-managed.** Closing the terminal or abandoning the wait
  never ends a session; sessions idle out server-side when no tab or traffic
  keeps them alive, and every session carries an expiry.
- **Exit codes.** A wait that expires with the session still `arming` exits 1
  (the session keeps arming server-side); a `failed` session exits 1. With no
  resolvable credentials at all, the command prints a login CTA
  (`walkeros auth login`) and exits 0 without a network call; a 401 despite a
  token still fails loudly.

### Prerequisites

- **Authentication:** `WALKEROS_TOKEN` env var or `walkeros auth`
- **Project:** `WALKEROS_PROJECT_ID` or `--project`

---

## validate

Validate flow configurations, events, mappings, or contracts.

### Usage

```bash
walkeros validate <input> [options]
```

Default: validates input as Flow.Json (schema, references, cross-step examples).

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
| `flow` (default) | Flow.Json    | Schema, references, cross-step examples |
| `event`          | Event object | Name format, schema, consent            |
| `mapping`        | Mapping      | Pattern format, rule structure          |
| `contract`       | Contract     | Named entries, extend, sections         |

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

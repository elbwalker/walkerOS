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

| Option                  | Description                                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-e, --event <source>`  | Event (required) - JSON string, file, or URL                                                                                                               |
| `--flow <name>`         | Flow to use                                                                                                                                                |
| `-p, --platform <type>` | Platform override                                                                                                                                          |
| `--simulate <step>`     | Simulate a step (repeatable for `destination.*`). Format: `source.NAME` \| `destination.NAME` \| `transformer.NAME` \| `collector.NAME`. Bare names error. |
| `--mock <step=value>`   | Mock a step with a specific return value (repeatable). Also `destination.NAME.before.ID=VALUE` and `collector.next.ID=VALUE` for chain members             |
| `--snapshot <source>`   | JS file to eval before execution (sets global state)                                                                                                       |
| `--json`                | JSON output                                                                                                                                                |
| `-v, --verbose`         | Verbose logging                                                                                                                                            |

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

# Simulate the collector step: enrichment, then collector.next
walkeros push flow.json -e event.json --simulate collector.default

# Mock one member of the collector chain
walkeros push flow.json -e event.json --simulate collector.default --mock collector.next.bot='{"name":"page view"}'
```

### `--simulate` rules

- Format is `<type>.<name>`. Bare names (`--simulate ga4`) error with
  `Invalid step format` and never bundle.
- `--simulate destination.*` is repeatable; every named destination is mocked,
  all others disabled.
- `--simulate source.*` and `--simulate transformer.*` are single-target.
  Multiple flags of those types error.
- All flags in one invocation must target the same type (no mixing
  destination/source/transformer/collector).
- `--simulate transformer.NAME` runs the transformer through its own `before`,
  its push, and its `next` route (and what follows), exactly as at runtime; the
  output is every finished copy.
- `--simulate collector.NAME` (any name, e.g. `collector.default`) runs the
  collector's enrichment, then `collector.next`. The output is every copy the
  destinations would receive: none when a `stop` drops the event, several when a
  `many` forks it.

---

## Running a built flow (not a CLI command)

The CLI has no `run` command. A built server flow runs with `runneros` from the
separate `@walkeros/runner` package (also the `walkeros/flow` image). It cannot
bundle: a local flow config is refused, one fed by URL or stdin fails at import.

### Usage

```bash
runneros start [artifact] [options]

Options:
  --flow-id <id>        App flow ID (enables heartbeat and secrets)
  --project <id>        Project ID (required with --flow-id)
  -p, --port <number>   Port (default: 8080)
  --env-file <path>     Load a dotenv file first (existing env wins)
  --json                JSON output
  -v, --verbose         Verbose output
  -s, --silent          Silent mode
```

### Examples

```bash
# Build, then start the entry inside dist/
walkeros bundle flow.json -o dist/
runneros start dist/flow.mjs --port 3000

# Start a packed archive
walkeros bundle flow.json -o flow.tar.gz
runneros start flow.tar.gz
```

---

## api

Send one authenticated request to the walkerOS app API and print the answer. The
CLI knows no app operation of its own: name the method and the path, and the app
validates the request. Projects, flows, deployments, previews, secrets and
Observe sessions are all reached this way.

### Usage

```bash
walkeros api <METHOD> <path> [options]
walkeros api ls [filter] [--json]
```

The method is `GET`, `POST`, `PUT`, `PATCH` or `DELETE`. Query parameters ride
in the path. The answer body is printed on stdout unchanged as it arrives,
streamed answers included.

### Options

| Option                  | Description                                                                |
| ----------------------- | -------------------------------------------------------------------------- |
| `-d, --data <body>`     | Request body: inline JSON, `@file.json`, or `-` for stdin (not on `GET`)   |
| `-H, --header <header>` | Extra header `'Name: value'`, repeatable (e.g. `Idempotency-Key`)          |
| `-p, --project <id>`    | Fills `{projectId}` in the path (default: `WALKEROS_PROJECT_ID`)           |
| `-y, --yes`             | Confirm a `DELETE`; without it a `DELETE` is a usage error and is not sent |

### Exit codes

| Code | Meaning                                                                        |
| ---- | ------------------------------------------------------------------------------ |
| 0    | Any 2xx answer                                                                 |
| 1    | Any other HTTP status: the error body on stdout, one line on stderr            |
| 2    | Usage error, nothing is sent                                                   |
| 3    | No credential, or the app answered 401                                         |
| 4    | The app could not be reached, or the connection broke while the answer arrived |

### api ls

`walkeros api ls [filter]` lists the public operations from the app's live
`/api/openapi.json`; the filter matches method, path and summary. `--json`
prints each operation with its parameters and the schemas it references. It
needs no sign-in.

### Examples

```bash
# Find the deployment operations
walkeros api ls deploy

# List the flows of a project
walkeros api GET /api/projects/{projectId}/flows --project proj_x7y8z9

# Save a flow's config to a file (WALKEROS_PROJECT_ID set)
walkeros api GET /api/projects/{projectId}/flows/flow_a1b2c3d4 | jq .config > flow.json
```

To deploy a saved flow from CI, see "Deploy from CI" in the
[CLI docs](https://www.walkeros.io/docs/apps/cli#deploy-from-ci).

---

## auth

The CLI authenticates with `WALKEROS_TOKEN` only: a token from Account >
Automation tokens in the app (`wos_pat_...`). Read it without echoing it
(`read -rs WALKEROS_TOKEN; export WALKEROS_TOKEN`), never inline; in CI set it
from the secret store; set it only for the commands that call the app. Without
it, `walkeros api` exits 3 with
`no token: set WALKEROS_TOKEN to a token from Account > Automation tokens in the walkerOS app`.
Sign-in fields an older CLI left in `~/.config/walkeros/config.json` are no
longer read and can be deleted.

| Subcommand | Purpose                       |
| ---------- | ----------------------------- |
| `whoami`   | Show who the token belongs to |

---

## validate

Validate flow configurations, events, mappings, or contracts.

### Usage

```bash
walkeros validate <input> [options]
```

Default: validates input as Flow.Json, every check on every flow and step
(schema, references, routes, root `contract`, bundle preflight, examples,
package settings). The text output starts with a `Scope:` line; skipped checks
are always listed.

### Options

| Option          | Description                                                          |
| --------------- | -------------------------------------------------------------------- |
| `--type <type>` | Validation type (default: `flow`). See types below.                  |
| `--path <path>` | Check one entry in every flow that has it (e.g. `stores.cache`)      |
| `--flow <name>` | Narrow per-flow checks to one flow; file-level checks still run      |
| `--strict`      | Contract violations exit 1; other warnings and skipped checks exit 2 |
| `--offline`     | Do not fetch package schemas; settings are not checked               |
| `--json`        | JSON output                                                          |
| `-v, --verbose` | Verbose output                                                       |
| `-s, --silent`  | Suppress output                                                      |

### Validation types

| Type             | Input        | What it checks                                                         |
| ---------------- | ------------ | ---------------------------------------------------------------------- |
| `flow` (default) | Flow.Json    | Everything, see above                                                  |
| `event`          | Event object | Name format, schema, consent                                           |
| `mapping`        | Mapping      | Pattern format, rule structure                                         |
| `contract`       | Contract     | Named entries, extend, sections; on a flow file its `contract` section |

Flow validation checks each step's resolved `config.settings` against its
package schema at the pinned version (from the CDN, or from disk for a local
`path`), as warnings for one minor. A step that imports a named export has no
settings schema yet and is skipped (`NO_SETTINGS_SCHEMA`). `$env.NAME:default`
is checked as its default; runtime-only values go to `details.deferred`. Use
`--path` for one entry (findings are errors there); it checks every flow that
has the entry:

```bash
walkeros validate flow.json --path destinations.snowplow
walkeros validate flow.json --path sources.browser
```

### Route checks

Every chain field (`source.before`, `source.next`, `transformer.before`,
`transformer.next`, `collector.next`, `destination.before`, `destination.next`)
is read with the runtime's route grammar:

| Check                                                     | Level                          |
| --------------------------------------------------------- | ------------------------------ |
| Route names a transformer that does not exist             | Error `UNKNOWN_ROUTE_TARGET`   |
| Entries after an unconditional `stop` (sequence or `one`) | Warning `dead code after stop` |
| Array made only of route configs (implicit `one`)         | Warning `first-match array`    |
| `many` with no entry or a single entry                    | Warning                        |

A `stop` inside `many` ends only its own copy, so its siblings are not dead
code. Repeated steps and member `next`s inside arrays are valid and not
reported.

### Exit codes

| Code | Meaning                                                                |
| ---- | ---------------------------------------------------------------------- |
| 0    | Valid (skips alone do not change it)                                   |
| 1    | Errors found, including contract violations under `--strict`           |
| 2    | No errors, but warnings or skips found (with `--strict` only)          |
| 3    | Could not run (missing file, invalid JSON, option that does not apply) |

### Examples

```bash
# Validate flow config (full check)
walkeros validate flow.json

# Narrow per-flow checks to one flow
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

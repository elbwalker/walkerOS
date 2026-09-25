---
name: walkeros-using-cli
description:
  Use when bundling walkerOS flows, testing events with simulate/push, running
  or deploying a built flow (runneros, the walkeros/flow image), validating
  configs, or configuring Flow JSON files.
---

# Using the walkerOS CLI

## Overview

The walkerOS CLI (`walkeros`) validates, simulates, tests and bundles event
collection flows. It does not run them: a built server flow runs with
`runneros start` from `@walkeros/runner` (the `walkeros/flow` image).

**Core workflow:**

1. **Configure** - Write Flow.Json JSON config
2. **Validate** - `walkeros validate flow.json`
3. **Test** - Simulate events (mocked) or push (real)
4. **Bundle** - `walkeros bundle flow.json -o dist/`
5. **Run** - `runneros start dist/flow.mjs`, or deploy through the app

## Quick Start

```bash
# Install
npm install -g @walkeros/cli

# Bundle a flow
walkeros bundle flow.json

# Test with simulated event
walkeros push flow.json -e '{"entity":"page","action":"view"}' --simulate destination.demo

# Push real event
walkeros push flow.json -e '{"entity":"page","action":"view"}'
```

## Commands Overview

| Command    | Purpose                                                     | Safe? |
| ---------- | ----------------------------------------------------------- | ----- |
| `bundle`   | Generate JS bundle from config                              | ✅    |
| `push`     | Execute with real API calls (or `--simulate` for mocked)    | ⚠️    |
| `setup`    | Run a component's `setup()` to provision external resources | ⚠️    |
| `deploy`   | Deploy flows to cloud                                       | ⚠️    |
| `previews` | Manage preview bundles for testing on live sites            | ⚠️    |
| `observe`  | Start a live observation session for a flow (app login)     | ⚠️    |
| `validate` | Validate configs/events                                     | ✅    |
| `cache`    | Manage caching                                              | ✅    |

For detailed command reference, see
[commands-reference.md](commands-reference.md).

---

## Common Workflows

### Development Workflow

```
1. Write flow.json config
2. Bundle: walkeros bundle flow.json
3. Simulate: walkeros push flow.json -e event.json --simulate destination.demo
4. Fix issues, repeat 2-3
5. Push test: walkeros push flow.json -e event.json
6. Deploy: walkeros deploy start <flowId>
```

### Multi-Flow Development

```bash
# Bundle specific flow
walkeros bundle flow.json --flow myFlow

# Bundle all flows
walkeros bundle flow.json --all

# Test specific flow
walkeros push flow.json --flow myFlow -e event.json --simulate destination.demo
```

### Local Development Server

```bash
# Build, then start the artifact with the runtime (a separate package)
walkeros bundle flow.json -o dist/
npx --package=@walkeros/runner runneros start dist/flow.mjs --port 3000
```

**Server port note:** Under `runneros` the runtime owns the port: it listens on
`--port` (or `PORT`, default 8080), serves `/health` and `/ready`, and hands
every other request to the flow's HTTP handler. A source's own `port` setting is
not used there.

---

## Flow.Json Configuration

### Minimal Config

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": {
        "platform": "web",
        "bundle": {
          "packages": {
            "@walkeros/web-destination-gtag": {}
          }
        }
      },
      "destinations": {
        "gtag": {
          "package": "@walkeros/web-destination-gtag",
          "config": { "measurementId": "G-XXXXXX" }
        }
      }
    }
  }
}
```

### Config Structure

```json
{
  "version": 4,
  "flows": {
    "<flowName>": {
      "config": {
        "platform": "web" | "server",  // Platform (required)
        "settings": {},                 // Platform-specific settings (optional)
        "bundle": {
          "packages": {},               // NPM packages pacote will install
          "overrides": {},              // Transitive dep version pins (npm-style)
          "traceInclude": []            // Optional: nft escape hatch (paths/globs)
        },
        "observe": {}                   // Optional: public observe connect pair (url + binding)
      },
      "sources": {},                    // Event sources
      "destinations": {},               // Event destinations
      "transformers": {},               // Transformer chain (optional)
      "mappings": {},                   // Event transformation rules
      "collector": {}                   // Collector configuration
    }
  }
}
```

**You do NOT need `npm install` for step packages.** flow.json's
`config.bundle.packages` is the single source of truth. Pacote installs them
transparently when you run `walkeros bundle`. Only `@walkeros/cli` belongs in
your project's `package.json` (as a devDependency).

**`config.bundle.overrides`** pins transitive dependency versions. Use it when a
vendor SDK's declared peer/dep range conflicts with another required version in
the same tree. Example: `{"@amplitude/analytics-types": "2.11.1"}` forces that
exact version everywhere in the install graph. Direct `packages` specs always
win over overrides; overrides only substitute transitive resolution.

**Schema version stays at 4.** Build-time fields live under
`flow.<name>.config.bundle.{packages, overrides, traceInclude}`. The
`flow.<name>.config.bundle.external` sub-field is no longer supported in
@walkeros/cli@4.x.

**`config.observe` bakes only public values.** For web flows, `walkeros bundle`
emits the `url` + `binding` connect pair statically into the bundle; the
per-session credential arrives out-of-band at runtime (`?elbObserve=` URL
param), so no secret ever enters the artifact. A partial pair (only one of the
two set) warns at build time and wires nothing.

For detailed configuration options, see
[flow-configuration.md](flow-configuration.md).

---

## Testing with Step Examples

### Simulate with `--step`

Target a specific step and provide input as `SourceInput`
(`{ content, trigger? }`):

```bash
# Simulate a source step with trigger metadata
walkeros push flow.json --simulate source.browser --event '{"content":"<html>...","trigger":{"type":"click"}}'

# Simulate a destination step with an event
walkeros push flow.json --simulate destination.gtag -e '{"entity":"order","action":"complete","data":{"total":149.97}}'
```

Example output (a destination step prints its matched mapping key and every
recorded vendor call, arguments as compact JSON cut at 300 chars):

```
success: true
  destination.pubsub
    mapping: none
    call PubSub.topic.publishMessage({"data":"{\"name\":\"order complete\",...}"})
  Duration: 44779ms
```

- `mapping: <key>` when a rule matched, `mapping: none` when the destination
  pushed without a rule, `mapping: none (skipped before mapping)` plus
  `no calls` when nothing was sent. Then why, when consent is the reason:
  `pending: waits for consent (require)` (never started; names the unmet
  `require` entries) or
  `skipped: consent (requires marketing; granted functional)` (started, event
  denied by its `consent` check). Source, transformer and collector steps print
  their recorded calls, then `event <json>` or `no events`; a failed step prints
  `error: <message>`.
- `--json` puts the same data under `simulations` (one
  `{ step, name, events, calls: [{ fn, args, ts }], mappingKey?, skipped?, error? }`
  per simulated step, in order; `skipped` is `{ reason: 'pending', require }` or
  `{ reason: 'consent', required, granted }`; a multi-destination simulate stops
  at the first failure). stdout is pure JSON, logs go to stderr, so `| jq` works
  without `--silent`. Values pass through `toPrintable` (`@walkeros/core/node`):
  `Error` to `{ name, message }`, `Buffer` to UTF-8, `bigint` to string,
  `Map`/`Set` to arrays, cycles to `"[Circular]"`.
- Text and JSON output (and MCP `flow_simulate`) are scrubbed with
  `scrubSecrets`, the same redactor the loggers use: service accounts, PEM keys,
  `Authorization`, `access_token`, credential-named fields and high-entropy runs
  show as `***`. The values of every `$secret.NAME` the flow references (set in
  the env, 6+ chars) are masked exactly, raw and JSON-escaped. The step still
  receives the real values. Simulate routes the flow's own logs through the
  masking CLI logger, so flow DEBUG lines need `--verbose`. A real push masks
  known values in its output only, not in flow logs; the runner does not mask
  them yet.
- **Only the target starts.** Destination simulate keeps only the target
  destination (no source, no other destination initializes); the flow's
  transformers still start, and a store without a mock env runs for real. Source
  simulate keeps only the simulated source (no browser page view or CMP decision
  from another source); captured events stop at the collector. A source package
  that declares `examples.env.simulation` (SQS, Pub/Sub pull) runs on its mock
  client with those calls recorded.
- **No real vendor calls** (destinations only). A package destination whose
  export has no mock env (`examples.env.push`) is refused before the flow starts
  (an inline `code` step has no package and runs as given):
  `No mock env for <package> export <exportName>: simulate would call the real vendor. Add examples.env.push to the package's dev examples.`
  A named export of a package version without `exportExamples` is refused with
  `...: this package version predates export-keyed examples; use a version with exportExamples or a local path.`
  A store whose package ships a mock env runs on it; a store without one runs
  for real. Sheets and GCS still need a real-format service-account key, since
  they sign their token request before the mocked `fetch` answers (see the CLI
  docs, "Secrets in simulate").
- **`--ingest <json|file|url>`** supplies the request context (a JSON object,
  e.g. `{"ip":"203.0.113.7","userAgent":"Mozilla/5.0"}`) for `transformer.*`,
  `collector.*` and `destination.*` simulation. It reaches the destination
  `before` chain and `context.ingest` (or `collector.next`); the CLI always sets
  `_meta`. Rejected for `source.*` and a real push:
  `--ingest applies to transformer, collector and destination simulation only`.
  A programmatic `pushCommand({ ingest })` on a real push or source simulate
  errors the same way; `simulateTransformer`, `simulateCollector` and
  `simulateDestination` take `ingest` directly.
- **`--consent <json|file|url>`** (a JSON object of booleans) is the collector
  consent a transformer, collector or destination simulation starts from
  (programmatic `consent`; collector: `state.consent`). `startFlow` applies it
  before the flow runs, as a `consent` command only the simulated destination
  hears: a `require: ["consent"]` destination starts, its consent check sees the
  granted keys, and a Consent Mode (`como`) target records its
  `gtag('consent','update',...)`. Rejected for `source.*` and a real push:
  `--consent sets collector consent for transformer, collector and destination simulation; for a source, simulate the CMP source's own example or set the event's consent.`
- **`--command <config|consent|user|run>`** makes a destination simulation run
  `collector.command(name, event)` instead of a push (a step example's
  `command`); the event is the command's data and its calls are recorded.
  Starting consent applies first, then the command. Elsewhere:
  `--command applies to destination simulation only.`
- **`--page-url <url>`** sets the page of a simulated web source (absolute
  `http`/`https` only). Precedence: `--page-url`, then the input trigger's
  `options.url`, then `http://localhost`. Elsewhere:
  `--page-url sets the page of a simulated web source; for request context use --ingest.`

Consent mental model (what decides whether a destination receives an event):

| Setting                         | Effect                                                                              | In simulate                                              |
| ------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `require: ["consent"]`          | Destination stays pending until the collector has ANY consent state                 | `--consent` starts it; else `pending: waits for consent` |
| `config.consent: { marketing }` | Each event checked against collector consent plus `event.consent`; denied = skipped | grant via `--consent` or the event; else `skipped`       |
| `event.consent`                 | Per event, counted on top of collector consent                                      | part of the `-e` event                                   |

- **Trace-mode limit.** Simulate injects the mock env before `init`, so clients
  built in `init` (BigQuery writer, Pub/Sub client) are recorded. Runtime trace
  mode (an Observe session at trace level) wraps the env per push only, so calls
  through a client built in `init` are not recorded there.

### Same flow via MCP (`flow_simulate`)

From an AI assistant the equivalent tool is `flow_simulate`. A few specifics:

- **`step` is required.** Pass the target as `"type.name"`, e.g.
  `"source.browser"`, `"collector.default"`, `"destination.gtag"`, or
  `"transformer.router"`. There is no all-steps mode.
- **Four step types: `source`, `collector`, `transformer`, `destination`.**
  Source-step `event` shape is `{ content, trigger? }`, where `content` is the
  walkerOS event `{ name, data }` and `trigger` is optional
  `{ type?, options? }`. There is no `env` field. Destination and transformer
  steps take a plain walkerOS event `{ name, data, consent? }`.
- **`collector` is the enrichment step plus the collector chain.** It takes a
  post-`next` partial event plus an optional state snapshot
  `{ consent?, user?, globals?, timing? }`, applies the collector's enrichment,
  then runs `collector.next`, and returns every event the destinations would
  receive (none when a `stop` drops it, several when `many` forks it).
- **`transformer`, `collector` and `destination` steps accept an optional
  `ingest`** (a raw ingest without `_meta`). Supply it to test a request decoder
  standalone (a GA4 decoder reading `ctx.ingest.url`: pass
  `ingest: { url: "..." }`), or to see the client IP and user agent a
  conversion-API destination sends (`ingest: { ip, userAgent }`). The result is
  scrubbed of credentials like the CLI output.
- **Sources are simulatable as a step**, including the `@walkeros/source-demo`
  demo source.
- **`configPath` accepts a cloud flow id** (`flow_...` / `cfg_...`), resolved
  the same way `flow_load` does, so you can simulate a saved flow without a file
  round-trip. Repeated simulations of the same configuration reuse a prebuilt
  bundle for faster runs; local file paths always rebuild. `flow_bundle` accepts
  a cloud flow id the same way.

`flow_load` loads a flow from a local path, URL, inline JSON, or a cloud
flow/config ID (`flow_...` / `cfg_...`). Configs returned by `flow_load` and
`flow_manage` are round-trip safe: structural values (package names, platform,
IDs) come back literally, so a returned config can be edited and sent back to
`flow_manage({ action: "update" })` unchanged.

When an MCP request fails, the `diagnostics` tool (read-only, no parameters,
works logged out) reports the MCP and CLI versions, the resolved app URL, app
`/api/health` reachability, the bundled OpenAPI contract version, and which
source served the last package lookup.

### Validate flow config

Validate schema, references, and cross-step example compatibility:

```bash
walkeros validate flow.json
```

All checks run automatically: schema validation, reference checking (a malformed
or inline `$flow.`/`$store.`/`$secret.`/`$contract.` value is a warning),
cross-step example compatibility (a StepOut `out` contributes the events its
`elb` and `return` effects pass on), and the examples of
`@walkeros/transformer-validate` steps against their own linked contract and
settings. No other example is checked against a contract. No flags needed for
full validation; `--strict` turns warnings into errors.

For full details on writing and testing with step examples, see
[using-step-examples](../walkeros-using-step-examples/SKILL.md).

---

## $code: Prefix (Inline JavaScript)

Embed JavaScript functions in JSON configs:

```json
{
  "fn": "$code:(event) => event.data.price * 100",
  "condition": "$code:(event) => event.data?.value > 100"
}
```

**Important:** The CLI bundler converts `$code:` strings to actual JavaScript
functions during build. This is essential for mappings in JSON configs.

For mapping patterns, see
[understanding-mapping](../walkeros-understanding-mapping/SKILL.md).

---

## Quick Reference

### Bundle Command

```bash
walkeros bundle <config> [options]

Options:
  --flow <name>     Bundle specific flow (default: "default")
  --all             Bundle all flows
  --stats           Show bundle statistics
  --json            JSON output
  --no-cache        Skip build cache
  -v, --verbose     Verbose output
  -s, --silent      Silent mode
```

Output:

- Web: `dist/walker.js` (single self-contained IIFE)
- Server: `dist/{flow.mjs, package.json, node_modules/}` (always a directory;
  nft-traced)
- Server archive: `flow.tar.gz` / `flow.tgz` (the server bundle directory packed
  into a single gzip file)

Use `-o ./dist/walker.js` for web, `-o ./dist/` for a server directory, or
`-o ./flow.tar.gz` for a server archive. Web single-file bundles do not support
archive output. Without `-o` the bundle is written to stdout, which for a server
flow is `flow.mjs` alone, without its `node_modules/`.

Also: `--release <id>` stamps a config release id on `event.source.release`;
`--manifest [url|path]` builds from a manifest (see "Manifest builds" below).

### Push Command

```bash
walkeros push <config|bundle> [options]

Options:
  -e, --event <json|file|url>   Event to process (required)
  --flow <name>                  Flow to use
  -p, --platform <web|server>   Platform override
  --simulate <step>              Simulate a step (repeatable for destination.*). Format: source.NAME | destination.NAME | transformer.NAME | collector.NAME
  --mock <step=value>            Mock a step with a specific return value (repeatable); chain members via destination.NAME.before.ID or collector.next.ID
  --ingest <json|file|url>       Request context for transformer/collector/destination simulate
  --consent <json|file|url>      Starting collector consent for transformer/collector/destination simulate
  --command <name>               Destination simulate runs this command (config|consent|user|run) instead of a push
  --page-url <url>               Page URL of a simulated web source (http/https)
  --snapshot <source>            JS file to eval before execution (sets global state)
  --json                         Pure JSON on stdout (incl. simulations); logs to stderr
```

### Validate Command

```bash
walkeros validate <input> [options]

Options:
  --type <type>     Validation type (default: flow). Also: event, mapping, contract
  --path <path>     Validate entry against package schema (e.g. destinations.snowplow)
  --flow <name>     Flow name for multi-flow configs
  --strict          Fail on warnings
  --json            JSON output

Exit codes:
  0 = Valid (with --strict: no warnings either)
  1 = Errors found (contract violations count as errors under --strict)
  2 = No errors, warnings found (with --strict only)
  3 = Validation could not run (missing file, invalid JSON, unknown --type)
```

### Running a built flow (`runneros`, not the CLI)

The CLI has no `run` command. The runtime is a separate package,
`@walkeros/runner`, with the binary `runneros`:

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

`[artifact]` (or `BUNDLE`, or `flow.mjs` in the working directory) is a
`.mjs`/`.js`/`.cjs` entry, a `.tar.gz`/`.tgz` archive holding `flow.mjs`, or an
http(s) URL to either. **The runtime does not bundle**: it has no bundler
installed; a local flow config is refused and one fed by URL or stdin fails at
import. Never generate a container or command that hands `flow.json` to the
runtime; bundle first. The full reference is "Deploying a server flow" below.

### Setup Command

```bash
# Provision external resources for one component (explicit only, never
# triggered by push, simulate, deploy, or the runtime)
walkeros setup <kind>.<name> [-c ./flow.json] [-f <flow>] [--json] [--verbose] [--silent]
```

The target uses the same `<kind>.<name>` syntax as `walkeros push --simulate`
(`source`, `destination`, or `store`). Package resolution follows the flow's
pins exactly like `bundle`: the version from `config.bundle.packages` (or inline
`@scope/pkg@x.y.z`, bundle pin wins) is downloaded through the shared pacote
pipeline and cache, then imported from the extracted tree. Setup works via npx
without a local install; `path:` entries in `config.bundle.packages` support
local development with a built package directory.

---

## Bundler Gotchas

- **Circular copies:** Never include the output directory itself (e.g.,
  `include: ["./dist"]` when output is `dist/`). The CLI detects this and
  errors.
- **`include` is server-only:** root `include` (default `./shared` when that
  folder exists) is copied next to server bundles only. A web build copies
  nothing and logs
  `include is ignored for web builds: a browser bundle cannot read local folders.`
- **Runtime paths:** `runneros` sets CWD to the bundle directory. File paths in
  `settings` resolve relative to the bundle, not the project root.
- **Component names:** Source, transformer, destination, and store names must be
  valid JavaScript identifiers (camelCase). Hyphens like `gtag-wrapper` cause
  syntax errors — use `gtagWrapper` instead.
- **Range conflicts:** When two transitive consumers declare incompatible ranges
  for the same dep (e.g., `arrify@^3.0.0` vs `arrify@^2.0.0`), the bundler
  resolves the chosen range to a concrete version and nests non-satisfying specs
  under their consumer. If a post-install warning surfaces declared-vs-installed
  mismatches, pin the dep in `config.bundle.overrides`. Set
  `BUNDLER_STRICT_RANGES=0` to bypass strict range validation when the npm
  registry is unreachable.

---

## Server bundles use nft tracing

Server flows are bundled with [`@vercel/nft`](https://github.com/vercel/nft).
The CLI:

1. Pacote installs every package declared in
   `flow.<name>.config.bundle.packages` into a per-build install root. Users do
   **not** run `npm install` for step packages; only `@walkeros/cli` lives in
   their `package.json`.
2. esbuild stage 1 externalizes all step packages.
3. esbuild stage 2 emits a small ESM `flow.mjs` that imports from those
   externalized packages.
4. nft traces `flow.mjs`, finds every file actually reachable at runtime
   (including `__dirname`-loaded `.proto` files and other assets), and copies
   only those files into `dist/node_modules/`.

There is no `walkerOS.bundle.external` annotation. nft figures it out.

After tracing, every declared `bundle.packages` entry the bundle actually
imports (bare imports of the built bundle, incl. `imports`) must be in the
trace, else the build throws `nft-trace: resolved packages missing from trace`.
A declared package that is neither imported nor traced (e.g. a type-only
dependency) only warns:
`Package <name> is declared in bundle.packages but nothing imports it; it is not in the bundle. Remove it from bundle.packages if unused.`

**Bundle directory (the server flow's unpacked artifact):**

```
dist/
├── flow.mjs        # ESM entry, expects to be at /app/flow/flow.mjs in prod
├── package.json     # informational sidecar (not used by the runner)
└── node_modules/    # only the files nft traced
```

The same directory can be packed into a `.tar.gz`/`.tgz` archive (see the Bundle
Command section), and `runneros start` accepts either form. Web flows are a
single `dist/walker.js`, served by any static host.

### Canonical Dockerfile

```dockerfile
ARG WALKEROS_VERSION

FROM node:24-alpine AS builder
ARG WALKEROS_VERSION
WORKDIR /build
RUN npm init -y && npm install --save-dev @walkeros/cli@${WALKEROS_VERSION}
COPY flow.json ./
RUN npx walkeros bundle flow.json -o dist/

FROM walkeros/flow:${WALKEROS_VERSION}
COPY --from=builder /build/dist/ /app/flow/
```

Build with `docker build --build-arg WALKEROS_VERSION=<version> .`.

Notes:

- The build stage only needs `@walkeros/cli`. flow.json drives every step
  package install; pacote handles it.
- `COPY --from=builder /build/dist/ /app/flow/` copies the whole directory
  (flow.mjs + package.json + node_modules/).
- The image sets `BUNDLE=/app/flow/flow.mjs`, `PORT=8080` and
  `CMD ["runneros", "start"]`. No command and no `BUNDLE` needed.
- One version pins both: `walkeros/flow:<v>` contains `@walkeros/runner@<v>`,
  matching `@walkeros/cli@<v>`. Images older than `@walkeros/runner` have no
  `runneros`; check with `docker run --rm walkeros/flow:<v> runneros --version`.
  Do not assume `latest` or a major tag carries it.

### Escape hatch: `traceInclude`

If nft cannot statically reach a runtime asset (rare: `require()` of a path
constructed from a runtime variable), declare it explicitly under
`flow.<name>.config.bundle.traceInclude`. Paths and globs both work; both
resolve against the install root, not the project directory:

```json
"flows": {
  "default": {
    "config": {
      "platform": "server",
      "bundle": {
        "packages": { "@walkeros/server-destination-gcp": {} },
        "traceInclude": [
          "node_modules/some-pkg/data/*.json",
          "node_modules/another-pkg/lib/runtime-loaded.js"
        ]
      }
    }
  }
}
```

### Cache (CI)

The bundler caches pacote downloads under `process.env.NPM_CACHE_DIR` (default
`<tmpDir>/cache/npm`). On CI, persist that path with `actions/cache`:

```yaml
- uses: actions/cache@v4
  with:
    path: .walkeros-cache/npm
    key: walkeros-${{ hashFiles('**/flow.json') }}
- run: WALKEROS_TMP_DIR=.walkeros-cache npx walkeros bundle flow.json -o dist/
```

**CI smoke check:**
`cd dist && node -e "import('./flow.mjs').then(()=>console.log('ok'))"` plus
`du -sh node_modules` (typical: 30-50MB for GCP destination, 10k+ files; use
`.dockerignore`).

---

## Deploying a server flow

### Build, run, orchestrate

| Stage                                   | Has                                             | Must not have                                 |
| --------------------------------------- | ----------------------------------------------- | --------------------------------------------- |
| Build (`walkeros bundle`)               | Registry access, esbuild, nft, a Node toolchain | Production secrets or traffic                 |
| Run (`runneros start`)                  | The artifact, its runtime secrets, the port     | A package manager, registry egress, a bundler |
| Orchestrate (you, CI, the walkerOS app) | The decision of what runs where                 | The ability to execute the artifact           |

The runtime cannot bundle because no bundler is installed in it, not because a
flag forbids it. Generate two steps (bundle, then start), never one.

### Artifact shape

- **Server:** a DIRECTORY, `dist/flow.mjs` + `dist/package.json` +
  `dist/node_modules/`. Every `COPY` and `-v` carries the whole directory
  (`COPY dist/ /app/flow/`, `-v "$PWD/dist:/app/flow:ro"`), never `flow.mjs`
  alone. Or one file: `walkeros bundle flow.json -o flow.tar.gz`.
- **Web:** a single `dist/walker.js` for any static host. The runtime has no
  static-file mode; to serve files from a server flow use `include` +
  `@walkeros/server-store-fs` + `@walkeros/server-transformer-file`.

### Runtime environment

| Variable                                   | Meaning                                                              |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `BUNDLE`                                   | Artifact path or URL (image default `/app/flow/flow.mjs`)            |
| `PORT`                                     | Port (default 8080)                                                  |
| `WALKEROS_FLOW_ID`, `WALKEROS_PROJECT_ID`  | App flow and project; together with a token enable heartbeat+secrets |
| `WALKEROS_DEPLOYMENT_ID`                   | Deployment ID sent with every heartbeat                              |
| `WALKEROS_DEPLOY_TOKEN` / `WALKEROS_TOKEN` | Token, deploy token first. Env only, never a config file             |
| `WALKEROS_APP_URL`                         | App base URL (default `https://app.walkeros.io`)                     |
| `WALKEROS_HEARTBEAT_INTERVAL`              | Seconds (default 60, minimum 10)                                     |
| `WALKEROS_CACHE_DIR`                       | Error cache dir (then `CACHE_DIR`, then XDG `~/.cache/walkeros`)     |
| `WALKEROS_OBSERVE_LEVEL`                   | `off`, `standard` or `trace`                                         |

Secrets are fetched ONCE at boot when connected (401/403 is fatal). There is no
config polling and no hot-swap: a new flow version is a rebuild and a redeploy.
`/health` is always 200; `/ready` is 200 once the collector is constructed, 503
otherwise.

### Constraints

- **Filesystem:** archive, URL and stdin inputs write to `/app/flow/`, so a
  read-only root filesystem works only with a local `.mjs` artifact in place.
  Point `WALKEROS_CACHE_DIR` at a writable path (the image's `/app/cache`).
- **Architecture:** the image is `linux/amd64` only.
- **Default store:** a `state` step without `store` uses the in-process
  `__cache` store, correct only on ONE instance. Do not scale such a flow out
  without a shared store.

Full page: `website/docs/apps/runtime.mdx`.

## Build-time values and package specs

- **`config.bundle.env`** declares the values web `$env.NAME` references resolve
  to at bundle time (literal strings only; a reference inside a value is
  refused). A local build layers it over the shell env; a hosted or manifest
  build uses it alone. `$flow` siblings resolve against the ENTRY flow's
  `bundle.env`. Values end up in a public bundle: never secrets. Server flows
  ignore it; their `$env` is read at runtime.
- **Package specs** must be registry version, range or tag, for direct pins,
  `overrides` values and transitive dependencies. Git, `file:`, `link:` and
  tarball URLs fail with `UNSUPPORTED_PACKAGE_SPEC`. Use a local `path` for
  development.

## Manifest builds

`walkeros bundle --manifest <url|path>` (a bare flag reads `BUILD_MANIFEST_URL`)
builds from a JSON manifest: `version: 1`, `toolchain` (exact CLI version, else
`TOOLCHAIN_MISMATCH`), `flowConfig`, `flowName?`, `buildEnv?`, `artifacts[]`
(`outputName`, `putUrl`, `contentType?`, `headers?`, plus `target` for a bundle
or `target: "wrap"` + `platform` + `skeleton` for a wrap), and `resultPutUrl`.
The CLI PUTs each artifact, then a result
`{ ok, toolchain, artifacts: [{ target, outputName, bytes, sha256 }], error?: { code, message, outputName? } }`.
Unknown top-level keys are ignored; artifact entries are strict; local
filesystem inputs are refused with `LOCAL_PATH_NOT_ALLOWED`. Only `--json`,
`-v`, `-s` combine with it. Schemas: `BuildManifestSchema`, `BuildResultSchema`,
`BUILD_ERROR_CODES` from `@walkeros/cli`.

---

## Troubleshooting

### Bundle Fails

1. **Check JSON syntax**: `walkeros validate flow.json --flow`
2. **Check package names**: Ensure packages exist on npm
3. **Clear cache**: `walkeros cache clear`

### Events Not Processing

1. **Validate event**: `walkeros validate event.json`
2. **Check mapping**: Event must match entity/action in mapping
3. **Use simulate first**:
   `walkeros push flow.json -e event.json --simulate destination.demo -v`

### Destination Not Found in Simulation

`Destination "NAME" not found in collector. Available: ...` means the flow has
no destination with that key; pick one from the list.

### Destination Silent (0 Events Received)

Read the line under `mapping:`:

1. **`pending: waits for consent (require)`**: the destination has
   `require: ["consent"]` and never started. Pass starting consent:
   `--consent '{"functional":true}'` (MCP: `state.consent`). Do not remove
   `require` to test.
2. **`skipped: consent (requires marketing; granted functional)`**: its
   `consent` setting denied the event. Grant the key in `--consent` or in the
   event's `consent`.
3. **Check mapping**: The event name must match a mapping rule (entity/action
   keys). Unmapped events pass through unmodified.
4. **Check policy**: Policy runs BEFORE mapping; verify policy isn't redacting
   fields needed by mapping rules.

### Web Simulation Transport

Web simulations run in JSDOM. `fetch` and `navigator.sendBeacon` are polyfilled
as tracked no-ops -- no real HTTP requests are made. Captured network calls are
included in `PushResult.networkCalls` when present.

### Local Packages Not Found

Use absolute or relative paths in `flow.<name>.config.bundle.packages`:

```json
{
  "config": {
    "platform": "web",
    "bundle": {
      "packages": {
        "my-destination": {
          "path": "./local/my-destination"
        }
      }
    }
  }
}
```

### CLI Prints "Upgrade Required" and Exits With Code 2

The walkerOS app requires a newer `@walkeros/cli` version for the endpoint you
just called. Upgrade and retry:

```bash
npm install -g @walkeros/cli@latest
```

See [Upgrading](https://walkeros.io/docs/upgrading) for the full
version-negotiation rules.

---

## Where CLI Lives

| Location                     | Purpose                 |
| ---------------------------- | ----------------------- |
| `packages/cli/`              | CLI source code         |
| `packages/cli/src/commands/` | Command implementations |
| `packages/cli/examples/`     | Example flow configs    |
| `packages/cli/README.md`     | Full CLI documentation  |

---

## Networking

Outbound requests to a configured `WALKEROS_APP_URL` carry
`X-WalkerOS-Client: cli` (or `mcp`) and `X-WalkerOS-Client-Version` headers so
the host can attribute usage and enforce minimum versions. No PII.

## Telemetry

The CLI supports anonymous usage telemetry (installation id, command name,
outcome, duration, environment) to help improve the tool. Telemetry is **off by
default** and requires explicit opt-in. No persistent identifier is written
before consent.

- **Opt in:** `walkeros telemetry enable`.
- **Opt out:** `walkeros telemetry disable`.
- **Current state:** `walkeros telemetry status`.
- **Forced off (override):** set `DO_NOT_TRACK=1` or
  `WALKEROS_TELEMETRY_DISABLED=1`.
- **Debug:** set `WALKEROS_TELEMETRY_DEBUG=1` to print the payload to stderr
  (requires opt-in; no network traffic).
- **Docs:** see [apps/telemetry](../../website/docs/apps/telemetry.mdx) for the
  full event list, privacy details, and legal basis.
- **Contract (source of truth):**
  [`packages/cli/src/telemetry/flow.json`](../../packages/cli/src/telemetry/flow.json).

---

## Related Skills

- [understanding-mapping](../walkeros-understanding-mapping/SKILL.md) - Mapping
  configuration
- [understanding-flow](../walkeros-understanding-flow/SKILL.md) - Data flow
  architecture
- [create-destination](../walkeros-create-destination/SKILL.md) - Creating
  destinations
- [create-source](../walkeros-create-source/SKILL.md) - Creating sources
- [debugging](../walkeros-debugging/SKILL.md) - Troubleshooting event flow

**Detailed References:**

- [commands-reference.md](commands-reference.md) - All commands with full
  options
- [flow-configuration.md](flow-configuration.md) - Complete Flow.Json reference
- [server-deployment.md](server-deployment.md) - Server flow deployment guide

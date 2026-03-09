---
name: walkeros-using-cli
description:
  Use when bundling walkerOS flows, testing events with simulate/push, running
  local servers, validating configs, or configuring Flow.Settings JSON files.
---

# Using the walkerOS CLI

## Overview

The walkerOS CLI (`walkeros`) bundles, tests, and runs event collection flows.

**Core workflow:**

1. **Configure** - Write Flow.Config JSON config
2. **Bundle** - Generate optimized JS bundle
3. **Test** - Simulate events (mocked) or push (real)
4. **Deploy** - Run locally or deploy to production

## Quick Start

```bash
# Install
npm install -g @walkeros/cli

# Bundle a flow
walkeros bundle flow.json

# Test with simulated event
walkeros simulate flow.json -e '{"entity":"page","action":"view"}'

# Push real event
walkeros push flow.json -e '{"entity":"page","action":"view"}'
```

## Commands Overview

| Command    | Purpose                        | Safe? |
| ---------- | ------------------------------ | ----- |
| `bundle`   | Generate JS bundle from config | ✅    |
| `simulate` | Test with mocked API calls     | ✅    |
| `push`     | Execute with real API calls    | ⚠️    |
| `run`      | Local HTTP event collection    | ✅    |
| `deploy`   | Deploy flows to cloud          | ⚠️    |
| `validate` | Validate configs/events        | ✅    |
| `cache`    | Manage caching                 | ✅    |

For detailed command reference, see
[commands-reference.md](commands-reference.md).

---

## Common Workflows

### Development Workflow

```
1. Write flow.json config
2. Bundle: walkeros bundle flow.json
3. Simulate: walkeros simulate flow.json -e event.json
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
walkeros simulate flow.json --flow myFlow -e event.json
```

### Local Development Server

```bash
# HTTP event collection server
walkeros run flow.json --port 3000
```

**Server port note:** The `--port` flag (or `PORT` env var) is forwarded at
runtime to all source configs that have a `port` setting. You don't need to
hardcode ports in the flow config — set `port: 8080` as a default and let the
runtime override it.

---

## Flow.Config Configuration

### Minimal Config

```json
{
  "version": 1,
  "flows": {
    "default": {
      "web": {},
      "packages": {
        "@walkeros/web-destination-gtag": {}
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
  "version": 1,
  "flows": {
    "<flowName>": {
      "web": {} | "server": {},     // Platform (required)
      "packages": {},               // NPM packages to bundle
      "sources": {},                // Event sources
      "destinations": {},           // Event destinations
      "transformers": {},           // Transformer chain (optional)
      "mappings": {},               // Event transformation rules
      "collector": {}               // Collector configuration
    }
  }
}
```

For detailed configuration options, see
[flow-configuration.md](flow-configuration.md).

---

## Testing with Step Examples

### Simulate with `--example`

Run a named step example through the full flow pipeline:

```bash
# Simulate the "purchase" step example
walkeros simulate flow.json --example purchase
```

Example output:

```
Step: destinations.gtag
  in:  { name: "order complete", data: { id: "ORD-123", total: 149.97 } }
  out: ["event", "purchase", { transaction_id: "ORD-123", value: 149.97 }]
  Status: PASS
```

### Validate flow config

Validate schema, references, and cross-step example compatibility:

```bash
walkeros validate flow.json
```

All checks run automatically — schema validation, reference checking, and
cross-step example compatibility. No flags needed for full validation.

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
  --dockerfile      Generate Dockerfile
  -v, --verbose     Verbose output
  -s, --silent      Silent mode
```

Output: `./dist/walker.js` (web) or `./dist/bundle.mjs` (server)

### Simulate Command

```bash
walkeros simulate <config|bundle> [options]

Options:
  -e, --event <json|file|url>   Event to process (required for bundles)
  --flow <name>                  Flow to simulate
  -p, --platform <web|server>   Platform override
  --json                         JSON output
```

### Push Command

```bash
walkeros push <config|bundle> [options]

Options:
  -e, --event <json|file|url>   Event to process (required)
  --flow <name>                  Flow to use
  -p, --platform <web|server>   Platform override
```

### Validate Command

```bash
walkeros validate <input> [options]

Options:
  --type <type>     Validation type (default: flow). Also: event, mapping, contract
  --path <path>     Validate entry against package schema (e.g. destinations.snowplow)
  --flow <name>     Flow name for multi-flow configs
  --strict          Treat warnings as errors
  --json            JSON output

Exit codes:
  0 = Valid
  1 = Errors found
  2 = Warnings (with --strict)
  3 = Input error
```

### Run Command

```bash
# HTTP event collection server
walkeros run <config|bundle> [options]

Options:
  -p, --port <number>   Port (default: 8080)
  -h, --host <string>   Host (default: 0.0.0.0)
```

---

## Bundler Gotchas

- **Circular copies:** Never include the output directory itself (e.g.,
  `include: ["./dist"]` when output is `dist/bundle.mjs`). The CLI detects this
  and errors.
- **Runtime paths:** The runner sets CWD to the bundle directory. File paths in
  `settings` resolve relative to the bundle, not the project root.
- **Component names:** Source, transformer, destination, and store names must be
  valid JavaScript identifiers (camelCase). Hyphens like `gtag-wrapper` cause
  syntax errors — use `gtagWrapper` instead.

---

## Troubleshooting

### Bundle Fails

1. **Check JSON syntax**: `walkeros validate flow.json --flow`
2. **Check package names**: Ensure packages exist on npm
3. **Clear cache**: `walkeros cache clear`

### Events Not Processing

1. **Validate event**: `walkeros validate event.json`
2. **Check mapping**: Event must match entity/action in mapping
3. **Use simulate first**: `walkeros simulate flow.json -e event.json -v`

### Local Packages Not Found

Use absolute or relative paths:

```json
{
  "packages": {
    "my-destination": {
      "path": "./local/my-destination"
    }
  }
}
```

---

## Where CLI Lives

| Location                     | Purpose                 |
| ---------------------------- | ----------------------- |
| `packages/cli/`              | CLI source code         |
| `packages/cli/src/commands/` | Command implementations |
| `packages/cli/examples/`     | Example flow configs    |
| `packages/cli/README.md`     | Full CLI documentation  |

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
- [flow-configuration.md](flow-configuration.md) - Complete Flow.Config
  reference
- [server-deployment.md](server-deployment.md) - Server flow deployment guide

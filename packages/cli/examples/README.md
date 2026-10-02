# walkerOS Flow Examples

## Installation

These are example configurations - see the main [CLI README](../README.md) for
installation.

## Usage

Build any example with `walkeros bundle`, then start a built server flow with
`runneros` from
[`@walkeros/runner`](https://www.npmjs.com/package/@walkeros/runner). The CLI
builds flows; it does not run them.

```bash
walkeros bundle examples/server-collect.json -o dist/
npx --package=@walkeros/runner runneros start dist/flow.mjs
```

A server flow builds to a directory (`flow.mjs`, `package.json` and
`node_modules/`); a web flow builds to a single `walker.js` for any static host.
Without `-o`, the bundle is written to stdout.

---

This directory contains example flow configurations demonstrating various
walkerOS use cases.

## Comprehensive Example

### flow-complete.json

**Purpose**: Complete reference demonstrating ALL JSON-compatible walkerOS
features

**Architecture**: Two named flows (`web` and `server`) showing full event
pipeline from browser to server-side forwarding.

**Documentation**: See [flow-complete.md](./flow-complete.md) for the complete
Feature Inventory and usage examples.

**Try it**:

```bash
# Server flow (HTTP collection endpoint)
walkeros bundle examples/flow-complete.json --flow server -o dist/server/
npx --package=@walkeros/runner runneros start dist/server/flow.mjs

# Web flow: build walker.js, then serve dist/web/ with any static server
walkeros bundle examples/flow-complete.json --flow web -o dist/web/

# Test either flow offline, destinations mocked
walkeros push examples/flow-complete.json --flow server \
  --event '{"name":"page view","data":{"title":"Home"}}' \
  --simulate destination.pubsub
```

---

## Web Examples

### web-serve.json

**Purpose**: Browser bundle that sends events to a collector

**Features**:

- sourceDemo (generates test events automatically)
- destinationDemo (console output for debugging)
- destinationAPI (sends events to http://localhost:8080/collect)

**Use case**: Demo web tracking that connects to server-collect.json for full
event flow testing

**Try it**:

```bash
walkeros bundle examples/web-serve.json -o dist/web/
npx serve dist/web -l 3000
# Load http://localhost:3000/walker.js from a page
```

## Server Examples

### server-collect.json

**Purpose**: Minimal server-side event collection endpoint

**Features**:

- sourceExpress (HTTP endpoint at /collect)
- destinationDemo (console logging)
- CORS enabled for browser requests

**Use case**: Simple event collector for demo and testing, receives events from
web-serve.json

**Try it**:

```bash
walkeros bundle examples/server-collect.json -o dist/server/
npx --package=@walkeros/runner runneros start dist/server/flow.mjs --port 8080

# In another terminal, send a test event:
curl -X POST http://localhost:8080/collect \
  -H "Content-Type: application/json" \
  -d '{"name":"page view","data":{"title":"Test"}}'
```

To run the same artifact in Docker, mount the whole directory where the
`walkeros/flow` image expects it:

```bash
docker run --rm -p 8080:8080 \
  -v "$PWD/dist/server:/app/flow:ro" \
  walkeros/flow:<version>
```

Use a `walkeros/flow` version that ships `runneros`, ideally the same version as
this CLI. See the [runtime docs](https://www.walkeros.io/docs/apps/runtime).

## Workflow: Web → Server

**Terminal 1 - Start collector**:

```bash
walkeros bundle examples/server-collect.json -o dist/server/
npx --package=@walkeros/runner runneros start dist/server/flow.mjs --port 8080
```

**Terminal 2 - Serve the web bundle**:

```bash
walkeros bundle examples/web-serve.json -o dist/web/
npx serve dist/web -l 3000
```

**Events flow**:

```
Browser (demo source) → destinationAPI → POST /collect → sourceExpress → destinationDemo (console)
```

## Creating Custom Examples

### Flow Configuration Structure

Flow configs use the `Flow.Json` format:

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "web" },
      "sources": {
        "<source_name>": {
          "package": "@walkeros/<package-name>",
          "config": {
            "settings": {
              /* source config */
            }
          }
        }
      },
      "destinations": {
        "<destination_name>": {
          "package": "@walkeros/<package-name>",
          "config": {
            "settings": {
              /* destination config */
            },
            "mapping": {
              /* event mappings */
            }
          }
        }
      },
      "collector": {
        "run": true,
        "globals": {
          /* global properties */
        }
      }
    }
  }
}
```

**Key points:**

- Platform is set via `config: { "platform": "web" }` (or `"server"`)
- Each step references its npm package directly via `package`
- With `-o dist/`, output is `dist/walker.js` (web) or `dist/flow.mjs` plus
  `package.json` and `node_modules/` (server)

## Event Naming Convention

**CRITICAL**: Events must follow the "ENTITY ACTION" format with space
separation:

✅ Correct:

- `"page view"`
- `"product add"`
- `"order complete"`
- `"button click"`

❌ Wrong:

- `"page_view"` (underscore)
- `"purchase"` (missing entity)
- `"add_to_cart"` (underscore)

The event name is parsed as: `const [entity, action] = event.split(' ')`

## Next Steps

1. Try each example with `walkeros push --simulate`, then `walkeros bundle`
2. Modify examples to match your tracking requirements
3. Create custom flow files for your use case
4. Deploy: `walkeros bundle`, then `runneros start` or the `walkeros/flow` image

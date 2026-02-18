# @walkeros/core

## 2.0.1

### Patch Changes

- e34c11e: Align all packages to unified v2 with consistent dependency structure

## 1.4.0

### Minor Changes

- 7b2d750: Add walkerOS.json package convention for CDN-based schema discovery

## 1.3.0

### Minor Changes

- a4cc1ea: Add collector.status for per-source and per-destination delivery
  tracking

## 1.2.2

### Patch Changes

- 7ad6cfb: Fix transformer chains computed on-demand instead of pre-computed

  Transformer chains configured via `destination.before` now work correctly.
  Previously, chains were pre-computed at initialization but the resolution
  function was never called, causing `before` configuration to be silently
  ignored.

  **What changed:**
  - Chains now compute at push time from `destination.config.before`
  - Removed unused `collector.transformerChain` state
  - Removed dead `resolveTransformerGraph()` function
  - Dynamic destinations now support `before` property

## 1.2.1

### Patch Changes

- 6256c12: Add inline code support for sources, transformers, and destinations
  - Add `InlineCodeSchema` with `push`, `type`, and `init` fields for embedding
    JavaScript in flow configs
  - Make `package` field optional in reference schemas (either `package` or
    `code` required at runtime)
  - Update `flow-complete.json` example with inline code demonstrations
    including enricher transformer, debug destination, and conditional mappings

## 1.2.0

### Minor Changes

- f39d9fb: Add array support for transformer chain configuration

  Enables explicit control over transformer chain order by accepting arrays for
  `next` and `before` properties, bypassing automatic chain resolution.

  **Array chain behavior:**

  | Syntax                           | Behavior                                               |
  | -------------------------------- | ------------------------------------------------------ |
  | `"next": "validate"`             | Walks chain via each transformer's `next` property     |
  | `"next": ["validate", "enrich"]` | Uses exact order specified, ignores transformer `next` |

  **Example:**

  ```json
  {
    "sources": {
      "http": {
        "package": "@walkeros/server-source-express",
        "next": ["validate", "enrich", "redact"]
      }
    },
    "destinations": {
      "analytics": {
        "package": "@walkeros/server-destination-gcp",
        "before": ["format", "anonymize"]
      }
    }
  }
  ```

  When walking a chain encounters an array `next`, it appends all items and
  stops (does not recursively resolve those transformers' `next` properties).

- 888bbdf: Add inline code syntax for sources, transformers, and destinations

  Enables defining custom logic directly in flow.json using `code` objects
  instead of requiring external packages. This is ideal for simple one-liner
  transformations.

  **Example:**

  ```json
  {
    "transformers": {
      "enrich": {
        "code": {
          "push": "$code:(event) => ({ ...event, data: { ...event.data, enriched: true } })"
        },
        "config": {}
      }
    }
  }
  ```

  **Code object properties:**
  - `push` - The push function with `$code:` prefix (required)
  - `type` - Optional instance type identifier
  - `init` - Optional init function with `$code:` prefix

  **Rules:**
  - Use `package` OR `code`, never both (CLI validates this)
  - `config` stays separate from `code`
  - `$code:` prefix outputs raw JavaScript at bundle time

## 1.1.0

### Minor Changes

- 20eca6e: Breaking change: Unified dynamic pattern syntax in Flow
  configuration, sorry!

  **New syntax:**
  - `$def.name` - Reference definitions (replaces
    `{ "$ref": "#/definitions/name" }`)
  - `$var.name` - Reference variables (replaces `$variables.name`)
  - `$env.NAME` or `$env.NAME:default` - Reference environment variables

  **Migration:**

  | Old Syntax                              | New Syntax                             |
  | --------------------------------------- | -------------------------------------- |
  | `{ "$ref": "#/definitions/itemsLoop" }` | `$def.itemsLoop`                       |
  | `$variables.currency`                   | `$var.currency`                        |
  | `${GA4_ID}` or `${GA4_ID:default}`      | `$env.GA4_ID` or `$env.GA4_ID:default` |

  **Note:** Only `$env` supports defaults (`:default`) because environment
  variables are external and unpredictable. Variables (`$var`) are explicitly
  defined in config, so missing ones indicate a configuration error and will
  throw.

  **Example:**

  ```json
  {
    "variables": { "currency": "EUR" },
    "definitions": {
      "itemsLoop": { "loop": ["nested", { "map": { "item_id": "data.id" } }] }
    },
    "destinations": {
      "ga4": {
        "config": {
          "measurementId": "$env.GA4_ID:G-DEMO123",
          "currency": "$var.currency",
          "items": "$def.itemsLoop"
        }
      }
    }
  }
  ```

### Patch Changes

- b65b773: Queue on() events until destination init completes

  Destinations now receive `on('consent')` and other lifecycle events only after
  `init()` has completed. Previously, `on()` was called before `init()`,
  requiring workarounds like gtag's `initializeGtag()` call inside its `on()`
  handler.

  Also renamed queue properties for clarity:
  - `destination.queue` → `destination.queuePush`
  - `destination.onQueue` → `destination.queueOn`

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

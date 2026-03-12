# @walkeros/collector

## 3.0.1

### Patch Changes

- @walkeros/core@3.0.1

## 3.0.0

### Minor Changes

- b6c8fa8: Add stores as a first-class component type in Flow.Config. Stores get
  their own `stores` section in flow settings, a `collector.stores` registry,
  and `$store:storeId` env wiring in the bundler. Includes `storeMemoryInit` for
  Flow.Config compatibility and type widening in cache/file transformers.

### Patch Changes

- 499e27a: Fix double-queuing of denied events when all events lack consent
- 499e27a: Add sideEffects declarations to all packages for bundler tree-shaking
  support.
- a2aa491: Fix store reference resolution: env values from `$store:` now
  correctly resolve to initialized Store.Instance during transformer/destination
  push. Preserve config.env across transformer init lifecycle.
- Updated dependencies [2b259b6]
- Updated dependencies [2614014]
- Updated dependencies [6ae0ee3]
- Updated dependencies [37299a9]
- Updated dependencies [499e27a]
- Updated dependencies [0e5eede]
- Updated dependencies [d11f574]
- Updated dependencies [d11f574]
- Updated dependencies [1fe337a]
- Updated dependencies [5cb84c1]
- Updated dependencies [23f218a]
- Updated dependencies [499e27a]
- Updated dependencies [c83d909]
- Updated dependencies [b6c8fa8]
  - @walkeros/core@3.0.0

## 2.1.1

### Patch Changes

- fab477d: Replace union transformer return type with unified
  `Transformer.Result` object. Transformers now return `{ event }` instead of
  naked events, and can optionally include `respond` (for wrapping) or `next`
  (for branching). The `BranchResult` type and `__branch` discriminant are
  removed.
- Updated dependencies [fab477d]
  - @walkeros/core@2.1.1

## 2.1.0

### Minor Changes

- 2bbe8c8: Add destroy lifecycle method to all step types (sources,
  destinations, transformers) and shutdown command to collector
- 3eb6416: Add unified `env.respond` capability. Any step (transformer,
  destination) can now customize HTTP responses via
  `env.respond({ body, status?, headers? })`. Sources configure the response
  handler — Express source uses createRespond for idempotent first-call-wins
  semantics. CLI serve mode removed (superseded by response-capable flows).
- 026c412: Unified simulation API: single simulate() function replaces
  simulateSource/simulateDestination/simulateTransformer/simulateFlow. Built-in
  call tracking for destinations via wrapEnv. No bundling required for
  simulation.

### Patch Changes

- 02a7958: Add WARN log level (ERROR=0, WARN=1, INFO=2, DEBUG=3). Logger
  instances expose `warn()` method routed to `console.warn` and `json()` method
  for structured output. Config accepts optional `jsonHandler`. MockLogger
  includes both as jest mocks. CLI logger unified with core logger via
  `createCLILogger()` factory.
- Updated dependencies [7fc4cee]
- Updated dependencies [7fc4cee]
- Updated dependencies [cb2da05]
- Updated dependencies [2bbe8c8]
- Updated dependencies [3eb6416]
- Updated dependencies [02a7958]
- Updated dependencies [97df0b2]
- Updated dependencies [97df0b2]
- Updated dependencies [026c412]
- Updated dependencies [7d38d9d]
  - @walkeros/core@2.1.0

## 2.0.1

## 2.0.0

### Minor Changes

- 32bfc92: Add transformer chain branching support

### Patch Changes

- Updated dependencies [7b2d750]
  - @walkeros/core@1.4.0

## 1.2.0

### Minor Changes

- a4cc1ea: Add collector.status for per-source and per-destination delivery
  tracking

### Patch Changes

- 9599e60: Fix silent event loss when destination processes queued events with
  mixed consent states
- Updated dependencies [a4cc1ea]
  - @walkeros/core@1.3.0

## 1.1.3

### Patch Changes

- e9c9faa: Fix transformer chain next property not being preserved during
  initialization

  The `initTransformers` function was not calling `extractChainProperty` to
  merge the definition-level `next` value into the transformer's config. This
  caused `walkChain` to only resolve the first transformer in any chain,
  breaking `destination.before` chains like
  `filter -> fingerprint -> geo -> sessionEnricher`.

## 1.1.2

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

- Updated dependencies [7ad6cfb]
  - @walkeros/core@1.2.2

## 1.1.1

### Patch Changes

- Updated dependencies [6256c12]
  - @walkeros/core@1.2.1

## 1.1.0

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

### Patch Changes

- Updated dependencies [f39d9fb]
- Updated dependencies [888bbdf]
  - @walkeros/core@1.2.0

## 1.0.1

### Patch Changes

- b65b773: Queue on() events until destination init completes

  Destinations now receive `on('consent')` and other lifecycle events only after
  `init()` has completed. Previously, `on()` was called before `init()`,
  requiring workarounds like gtag's `initializeGtag()` call inside its `on()`
  handler.

  Also renamed queue properties for clarity:
  - `destination.queue` → `destination.queuePush`
  - `destination.onQueue` → `destination.queueOn`

- Updated dependencies [b65b773]
- Updated dependencies [20eca6e]
  - @walkeros/core@1.1.0

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

### Patch Changes

- Updated dependencies [67c9e1d]
  - @walkeros/core@1.0.0

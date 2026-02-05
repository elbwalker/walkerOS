# @walkeros/cli

## 1.1.3

### Patch Changes

- 6fcfaf5: Fix chain property handling for all component types in bundler.
  Sources now correctly output `next` property for pre-collector transformer
  chains. Unified inline code generation for sources, destinations, and
  transformers. Standardized transformer `next` as top-level property
  (consistent with destination `before`).

## 1.1.2

### Patch Changes

- Updated dependencies [7ad6cfb]
  - @walkeros/core@1.2.2
  - @walkeros/server-core@1.0.4

## 1.1.1

### Patch Changes

- 6256c12: Add inline code support for sources, transformers, and destinations
  - Add `InlineCodeSchema` with `push`, `type`, and `init` fields for embedding
    JavaScript in flow configs
  - Make `package` field optional in reference schemas (either `package` or
    `code` required at runtime)
  - Update `flow-complete.json` example with inline code demonstrations
    including enricher transformer, debug destination, and conditional mappings

- Updated dependencies [6256c12]
  - @walkeros/core@1.2.1
  - @walkeros/server-core@1.0.3

## 1.1.0

### Minor Changes

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

- fdf6e7b: Add transformer support to CLI bundler
  - Detect and bundle transformer packages from flow.json configuration
  - Support transformer chaining via `next` field
  - Handle `$code:` prefix for inline JavaScript in transformer config
  - Generate proper import statements and config objects for transformers
  - Document transformer configuration in flow.json

- Updated dependencies [f39d9fb]
- Updated dependencies [888bbdf]
  - @walkeros/core@1.2.0
  - @walkeros/server-core@1.0.2

## 1.0.2

### Patch Changes

- 2709933: Add `$code:` prefix support for inline JavaScript in flow.json

  Values prefixed with `$code:` are output as raw JavaScript instead of quoted
  strings in the bundled output. This enables features like `fn:` callbacks and
  `condition:` predicates directly in JSON configuration files.

  Example:

  ```json
  { "fn": "$code:(value) => value.toUpperCase()" }
  ```

  Outputs:

  ```javascript
  {
    fn: (value) => value.toUpperCase();
  }
  ```

- 04469bb: Auto-detect default export for sources and destinations

  Sources and destinations now automatically use their package's default export,
  eliminating the need to specify `imports` for the main function.

  Before (verbose):

  ```json
  "@walkeros/web-source-browser": { "imports": ["sourceBrowser"] }
  ```

  After (simpler):

  ```json
  "@walkeros/web-source-browser": {}
  ```

  The `imports` field is now only needed for utility functions. Explicit `code`
  still works for packages without default exports.

- 544a79e: Implicit collector: auto-add @walkeros/collector when
  sources/destinations exist

  The CLI now automatically adds `@walkeros/collector` and imports `startFlow`
  when your flow has sources or destinations. No need to declare the collector
  package.

  Before (verbose):

  ```json
  "packages": {
    "@walkeros/collector": { "imports": ["startFlow"] },
    "@walkeros/web-source-browser": {},
    "@walkeros/destination-demo": {}
  }
  ```

  After (simpler):

  ```json
  "packages": {
    "@walkeros/web-source-browser": {},
    "@walkeros/destination-demo": {}
  }
  ```

  You only need to specify `@walkeros/collector` when you want to pin a specific
  version or use a local path for development.

- 4da2ef3: Fix CLI commands hanging after completion

  Commands (`bundle`, `simulate`, `push`) would hang indefinitely after
  completing successfully due to open handles keeping the Node.js event loop
  alive.

  Root cause: esbuild worker threads and pacote HTTP keep-alive connections were
  not being cleaned up.

  Fixes:
  - Add `esbuild.stop()` after builds to terminate worker threads
  - Add explicit `process.exit(0)` on successful completion for all CLI commands

- 2f82a2e: Fix simulate command JSON output to use consistent `result` property
  instead of `elbResult`
- Updated dependencies [b65b773]
- Updated dependencies [20eca6e]
  - @walkeros/core@1.1.0
  - @walkeros/server-core@1.0.1

## 1.0.1

### Patch Changes

- eb878df: Improved CLI option consistency and added `--dockerfile` flag
  improvements

  **Option consistency:**
  - Added `--flow` option to simulate command for multi-flow configs
  - Standardized `-v/--verbose` and `-s/--silent` shortcuts across all commands
  - Removed non-functional `--dry-run` option from all commands
  - Removed `-f` shortcut from bundle (use `--flow` for consistency)
  - Unified option description casing (lowercase)

  **Dockerfile improvements:**
  - Generate correct `MODE=serve` for web flows and `MODE=collect` for server
    flows
  - Support copying custom Dockerfiles with `--dockerfile path/to/Dockerfile`
  - Respects `--flow` parameter for multi-flow configurations

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

### Patch Changes

- Updated dependencies [67c9e1d]
  - @walkeros/core@1.0.0
  - @walkeros/server-core@1.0.0

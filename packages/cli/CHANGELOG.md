# @walkeros/cli

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

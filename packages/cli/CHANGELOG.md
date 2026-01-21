# @walkeros/cli

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

---
'@walkeros/cli': patch
---

Improved CLI option consistency and added `--dockerfile` flag improvements

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

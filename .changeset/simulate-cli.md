---
'@walkeros/cli': minor
'@walkeros/core': minor
'@walkeros/mcp': minor
---

`walkeros push --simulate` prints each step's mapping and vendor calls
(`simulations` in `--json`) and reports init or push failures. New flags:
`--ingest`, `--consent` (MCP `state.consent`), `--command` for command examples,
`--simulate collector.default` and `--mock collector.next.<id>`. A destination
that sent nothing says why in `skipped`. `toPrintable` is exported.

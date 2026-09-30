---
'@walkeros/cli': minor
'@walkeros/mcp': patch
---

`walkeros validate` prints a `Scope:` line and returns `details.scope` (flows
and checks) instead of `details.validatedFlow`; `details.skipped` lists checks
that did not run, such as an unreachable package schema (exit 0). `--path` and
`--flow` narrow every check; paths start with `flows.<flow>.`. Errors and
warnings carry stable codes, settings errors `ENTRY_SCHEMA` plus `keyword`.
`--path` or `--flow` with a non-flow `-t` exits 3.

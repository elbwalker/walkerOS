---
'@walkeros/cli': minor
'@walkeros/mcp': minor
---

`walkeros validate` prints a `Scope:` line and returns `details.scope` instead
of `details.validatedFlow`, `details.skipped` for checks that did not run and
`details.deferred` for values known only at runtime. Skips never read as passed.
Every finding has a stable `code`. `--strict` fails on warnings or skips (exit
2), and `validate()` and `flow_validate` with `strict` return `valid: false`;
`flow_validate` also accepts `offline`.

---
'@walkeros/cli': minor
---

Files that passed `walkeros validate` may now fail: it checks every flow and
every step's package settings unless you narrow it, and resolves each flow as
the bundler does, so an unresolvable `$flow` is an error. `--path` checks the
entry in every flow. Settings findings warn for one minor. Named-export steps
are skipped; `--offline` skips fetching.

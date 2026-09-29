---
'@walkeros/cli': patch
'@walkeros/core': minor
---

A flow's own log lines now go through the CLI logger: its debug lines need
`--verbose`, and they go to stderr with `--json`. Version numbers are no longer
masked as tokens, so `walkeros deploy` shows the image tag and `bundle --stats`
shows package versions. Paths under the system temp directory print as
`$TMPDIR/...`.

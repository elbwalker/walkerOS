---
'@walkeros/core': minor
---

The CLI logger's `knownSecrets` option also accepts a function, read on every
line, so values learned after the logger was created are masked too. Paths under
the system temp directory now print as `$TMPDIR/...`; on Linux, where `TMPDIR`
is often unset, read that as the system temp directory.

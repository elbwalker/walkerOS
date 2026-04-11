---
'@walkeros/cli': patch
---

Fix bare filename resolution in bundle command — `walkeros bundle flow.json` now
resolves relative to cwd instead of CLI examples directory. Add TTY hint when
writing to stdout.

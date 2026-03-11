---
'@walkeros/core': major
'@walkeros/mcp': patch
---

BREAKING: Flow configs now require `"version": 3`. Versions 1 and 2 are no
longer accepted. To migrate, change `"version": 1` or `"version": 2` to
`"version": 3` in your walkeros.config.json.

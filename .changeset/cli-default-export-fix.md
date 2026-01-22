---
'@walkeros/cli': patch
---

Auto-detect default export for sources and destinations

Sources and destinations now automatically use their package's default export,
eliminating the need to specify `imports` for the main function.

Before (verbose):

```json
"@walkeros/web-source-browser": { "imports": ["sourceBrowser"] }
```

After (simpler):

```json
"@walkeros/web-source-browser": {}
```

The `imports` field is now only needed for utility functions. Explicit `code`
still works for packages without default exports.

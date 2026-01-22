---
'@walkeros/cli': patch
---

Implicit collector: auto-add @walkeros/collector when sources/destinations exist

The CLI now automatically adds `@walkeros/collector` and imports `startFlow`
when your flow has sources or destinations. No need to declare the collector
package.

Before (verbose):

```json
"packages": {
  "@walkeros/collector": { "imports": ["startFlow"] },
  "@walkeros/web-source-browser": {},
  "@walkeros/destination-demo": {}
}
```

After (simpler):

```json
"packages": {
  "@walkeros/web-source-browser": {},
  "@walkeros/destination-demo": {}
}
```

You only need to specify `@walkeros/collector` when you want to pin a specific
version or use a local path for development.

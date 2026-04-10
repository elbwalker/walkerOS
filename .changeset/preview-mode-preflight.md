---
'@walkeros/cli': minor
---

Add preview mode preflight to web bundles

- `WrapSkeletonOptions` accepts optional `previewOrigin` and `previewScope`
  fields
- `generateWrapEntry` injects a preflight snippet before `startFlow` when both
  are set: checks `?elbPreview` param / cookie, loads preview bundle from
  `{previewOrigin}/preview/{previewScope}/walker.{token}.js`, skips production
  flow. Zero overhead when preview options are absent.
- Input validation rejects path-traversal in `previewScope` and special
  characters in `previewOrigin`.

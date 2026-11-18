---
'@walkeros/runner': patch
---

Outside the image, `runneros start` extracts archives into a private folder
under the system temp directory, and the `Instance` line prints its id readable.
Migration: `getInstanceId` is gone and `newInstanceId` is exported in its place,
`HeartbeatConfig.instanceId` and `PipelineOptions.instanceId` are now required,
the error file is now `errors-<port>.jsonl`, and `@walkeros/runner` now depends
on `@walkeros/server-core`. `resolveBundle` returns the private folder as
`folder`; the caller removes it.

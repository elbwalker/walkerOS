---
'@walkeros/core': minor
---

New `@walkeros/core/node` entry point with the Node-only helpers the CLI and the
runner both share: `scrubSecrets`, `redactLine`, `createCLILogger`,
`createCLILoggerConfig`, `getTmpPath`, `createTmpResolver` and
`getDefaultTmpRoot`. The main entry gains `createTimer` and `getErrorMessage`.

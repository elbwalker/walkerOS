---
'@walkeros/cli': minor
'@walkeros/core': minor
---

`walkeros bundle --manifest <url|path>` builds every artifact a build manifest
lists and uploads each one with a result. Declare build values in
`config.bundle.env`; they must be literal strings and supply `$env` in web
bundles. Step packages, overrides and their dependencies must now come from the
npm registry: git, file and URL specs are rejected.

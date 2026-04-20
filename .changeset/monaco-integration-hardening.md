---
'@walkeros/explorer': patch
---

Harden the Monaco / CodeBox integration. Fix `moduleDetection` (Force), add
`<LiveCode>` `configLanguage` prop, guard `ScriptTarget.ES2022` fallback, warn
on `loader.init()` failures in dev, drop dead code. No API change for existing
callers.

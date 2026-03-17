---
'@walkeros/mcp': minor
'@walkeros/core': patch
'@walkeros/config': patch
---

Replace hardcoded package registry with live npm search. Package catalog is now
fetched dynamically from npm and enriched with walkerOS.json metadata from CDN.

Change platform type from string to array. Packages declare platform as ["web"],
["server"], or ["web", "server"]. Empty array means platform-agnostic. The
normalizePlatform utility handles backwards compatibility with the old string
format from already-published packages.

Remove outputSchema from package_get to prevent SDK validation crashes on
unexpected field values.

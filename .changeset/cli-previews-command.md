---
'@walkeros/cli': patch
---

Add `walkeros previews {list|get|create|delete}` commands for managing preview
bundles. `create` supports `--flow <name>` or `--settings-id <id>` to target a
flow settings entry, and `--url <siteUrl>` to produce a ready-to-open activation
URL. Use `--open` to launch it in your default browser.

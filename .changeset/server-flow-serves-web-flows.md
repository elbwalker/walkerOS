---
'@walkeros/core': patch
'@walkeros/cli': patch
'@walkeros/mcp': patch
---

A server flow lists the web flows it serves in `config.bundle.flows`.
`walkeros bundle`, `flow_bundle` and manifest builds build each one beside the
server bundle or into its archive, and a manifest can upload each as an output
of its own. `walkeros validate` checks the listing.

---
'@walkeros/core': patch
---

Flow validation now scopes the "web flows cannot reference a managed secret"
check per flow. A multi-flow config where a web flow forwards to a server flow
that holds a `$secret.` reference now validates cleanly, instead of the server
flow's secret being wrongly flagged against the web flow.

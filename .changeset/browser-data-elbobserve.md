---
'@walkeros/web-source-browser': minor
---

The browser source now supports a `data-elbobserve` attribute. Mark a container
with it and any tagged content a SPA injects into that container is
auto-registered for tracking, and cleaned up when removed, without calling
`walker init` after each injection. Works in light DOM and open shadow roots.

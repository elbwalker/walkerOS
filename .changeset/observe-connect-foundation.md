---
'@walkeros/core': patch
'@walkeros/collector': patch
'@walkeros/cli': patch
---

Connect a running flow to an observation session and watch its live events from
web, server, or bundled runtimes. Commit only a public observer URL and project
binding; the per-session credential arrives out-of-band, so no secrets land in
code or artifacts. Ingest posts carry a versioned envelope with release
provenance, and `walkeros observe start` opens sessions from the terminal.

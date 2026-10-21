---
'@walkeros/collector': patch
---

A destination or transformer `init` that does not settle within the step's
timeout (destination `config.timeout`, default 10 seconds; transformers use the
default) now fails the waiting pushes with code `timeout` instead of leaving
them unanswered. The next push retries the `init`.

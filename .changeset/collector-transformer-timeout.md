---
'@walkeros/collector': patch
---

Transformers accept `config.timeout` in milliseconds (default 10000). It bounds
`init` and each `push`; a push that does not settle fails the event with code
`timeout` instead of leaving the push unanswered.

---
'@walkeros/core': minor
'@walkeros/collector': minor
---

A source's `env` is now unambiguously the author's dependency bag: the
collector-provided `push`, `elb`, `command`, `logger` and `sources` always win,
so setting them in `env` has no effect. Sources that need the pipeline to end
elsewhere declare the new `terminus`, which receives the raw event and skips the
pipeline entirely; previously an `env.push` silently replaced the pipeline's end
and disabled some, but not all, of its stages, and flows that set it should move
to `terminus`. Stored flows now also reject unknown keys on a source entry at
validation instead of silently ignoring them.

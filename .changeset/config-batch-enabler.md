---
'@walkeros/collector': minor
---

Destinations now batch every event when you set `config.batch`, with no `'* *'`
wildcard mapping rule needed. A bare number sets the debounce wait;
`{ wait, size, age }` tunes the window. Rule-level `batch` still overrides per
event type, and pending batches now flush on shutdown.

Migration: if you previously set `config.batch` alongside a single non-wildcard
rule `batch`, `config.batch` only capped that rule before; it now batches all of
the destination's events. To batch only specific events, drop `config.batch` and
set `batch` on those rules.

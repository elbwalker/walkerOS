---
'@walkeros/collector': minor
---

A destination's `on()` handler now receives the current state before any event
is sent to it, including with `require`, `walker destination` at runtime, and
state passed to `walker run`. Handlers are awaited up to `config.timeout`; a
destination whose handler does not respond receives no events until it does. The
exported `callDestinationOn` now returns a promise.

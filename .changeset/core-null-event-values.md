---
'@walkeros/core': patch
---

`null` is a valid event value; mapping is unchanged and still skips a value that
is or contains `null`. `filterValues` keeps `null` and turns a date into its
timestamp, so MCP `flow_simulate` keeps `null` inputs. A `TypeError`,
`RangeError` or `ReferenceError` is now a non-retryable `runtime` failure
instead of `transport`; Node's `fetch failed` stays `transport`. `deepMerge` and
`clone` ignore `__proto__` keys.

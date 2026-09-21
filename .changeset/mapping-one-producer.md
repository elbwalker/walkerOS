---
'@walkeros/core': minor
---

A mapping value now runs exactly one producer, in the order `loop`, `map`,
`set`, `key`, `fn`; the rest never run, so a `fn` next to a `key` is ignored. To
transform a field, use `fn` alone. A `loop` over something that is not a list
now yields the `value` fallback instead of the whole event.

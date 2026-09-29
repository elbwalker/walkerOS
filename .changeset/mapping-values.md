---
'@walkeros/core': minor
'@walkeros/transformer-validate': patch
---

A mapping value runs exactly one producer, in the order `loop`, `map`, `set`,
`key`, `fn`, so a `fn` next to a `key` is ignored. A `loop` over a non-list
yields the `value` fallback. A mapping or `policy` entry that resolves to
nothing removes the field. The validate transformer never throws and `pass` mode
keeps such events.

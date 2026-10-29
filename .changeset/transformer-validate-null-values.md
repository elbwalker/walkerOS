---
'@walkeros/transformer-validate': patch
---

With `format: true`, an event holding `null` values now passes the format check,
because `null` is a valid walkerOS event value. Before, such an event got the
verdict `false`: in `pass` mode it was marked invalid, and in `strict` mode it
was dropped.

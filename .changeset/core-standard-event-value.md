---
'@walkeros/core': patch
---

`getEvent` returns the same event on every run: a fixed timestamp and an id
derived from the event name. It accepts only standard event names, so a typo no
longer compiles; `createEvent` builds any other event and uses the same fixed
default timestamp. `order complete` carries the order amount as `data.value`
instead of `data.total`, and the package examples read `data.value`.

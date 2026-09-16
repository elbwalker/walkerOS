---
'@walkeros/web-source-browser': patch
---

An invalid entity name such as `data-elb="shopping cart"` or
`data-elb="foo;bar"` no longer throws and loses the event: it is ignored like a
missing entity, so other entities and events on the page are tracked as before.
Link ids (`data-elblink`) containing quotes or brackets no longer throw either.

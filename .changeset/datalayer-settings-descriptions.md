---
'@walkeros/web-source-datalayer': patch
---

The `prefix` and `filter` setting descriptions now match the behaviour: the
prefix is the entity of every event name and filters nothing, and a filter that
returns `true` skips the entry. The package metadata links the documentation
page at its exact path; the old link returned 404.

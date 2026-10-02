---
'@walkeros/collector': patch
---

Browser bundles built with the CLI only include observe, stores, step `state`
and runtime validation when the flow uses them. A step `state` that such a
bundle cannot run, for example on a destination added with `walker destination`,
logs a warning.

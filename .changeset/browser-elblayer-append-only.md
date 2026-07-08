---
'@walkeros/web-source-browser': minor
---

The elbLayer is append-only with guaranteed ordering: walker commands apply
immediately, events process in push order once the source starts, and entries
stay inspectable in the array. `walker init` now works from every entry point,
including `elbLayer.push`. The browser source owns `window.elb` (name via
`settings.elb`) and returns a result promise; the `ELBLayer` and
`ELBLayerConfig` types were removed.

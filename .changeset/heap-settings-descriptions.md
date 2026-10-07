---
'@walkeros/web-destination-heap': patch
---

The `disablePageviewAutocapture`, `disableSessionReplay` and `ingestServer`
descriptions now say that the classic Heap SDK loaded by `loadScript` ignores
them. The settings schema lists `heapConfig` for further `heap.load()` options,
and the step examples name the destination config they rely on and the consent
methods the classic SDK lacks.

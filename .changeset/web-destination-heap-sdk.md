---
'@walkeros/web-destination-heap': patch
---

Validation rejects `disablePageviewAutocapture`, `disableSessionReplay` and
`ingestServer`: the classic Heap SDK never read them (use `heapConfig`). Events
pushed before Heap loads now reach it, consent commands no longer stall the
destination, and a missing `appId` is a `config` error.

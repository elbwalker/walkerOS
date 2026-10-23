---
'@walkeros/web-destination-heap': patch
---

The `disableTextCapture`, `secureCookie` and `heapConfig` descriptions now say
that these settings apply only with `loadScript: true`, where the destination
writes them into the config the classic Heap SDK reads when it loads. With your
own Heap snippet, set these options in the snippet.

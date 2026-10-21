---
'@walkeros/server-destination-tiktok': patch
---

A request that TikTok answers with HTTP 200 and a non-zero `code` now fails the
push instead of counting as delivered; rate limits and server errors are
retryable, other rejections are not. Rules with `silent: true` send nothing.

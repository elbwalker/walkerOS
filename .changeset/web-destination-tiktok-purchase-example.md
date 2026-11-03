---
'@walkeros/web-destination-tiktok': patch
'@walkeros/explorer': patch
---

The order example maps to TikTok's current `Purchase` standard event instead of
`CompletePayment`. Every example names its vendor call as a simulation records
it (`window.ttq.track`, `window.ttq.identify`, `window.ttq.enableCookie`), and
the include, identify and consent examples say which config they run with. The
explorer's destination mapping demo shows `Purchase` for TikTok too.

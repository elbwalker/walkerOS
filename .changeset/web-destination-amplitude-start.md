---
'@walkeros/web-destination-amplitude': patch
---

Without Session Replay, Experiment or Guides & Surveys settings only Amplitude
analytics starts; enabling one still starts all three. Options now reach the SDK
(`autocapture: false` was lost before). A missing `apiKey` is a `config` error
and a failed init is retried by the next push.

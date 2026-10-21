---
'@walkeros/web-destination-segment': patch
---

`cdnURL` now reaches Analytics.js; before it was ignored, so a proxy was
bypassed. A missing `apiKey` is a `config` error, a failed Analytics.js load
fails later events, and a consent-gated destination loads Analytics.js on its
first event after the grant.

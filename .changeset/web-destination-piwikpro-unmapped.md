---
'@walkeros/web-destination-piwikpro': patch
---

Events that no rule maps fail with `missing-input` instead of a warning; use an
`ignore: true` rule to keep an event out without a failure. A blocked `ppms.js`
fails later events visibly.

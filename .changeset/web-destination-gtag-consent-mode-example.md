---
'@walkeros/web-destination-gtag': patch
---

The Consent Mode v2 example says which setup it shows: without `config.consent`
the first consent command sends the denied default before the update; with
`config.consent` the denied default goes out before `config`, when the
destination starts.

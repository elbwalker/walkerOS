---
'@walkeros/web-destination-mixpanel': patch
'@walkeros/web-destination-posthog': patch
'@walkeros/web-destination-tiktok': patch
'@walkeros/web-destination-pinterest': patch
'@walkeros/web-destination-optimizely': patch
---

A consent handler decides on the whole consent state against the destination's
own `config.consent` and acts only when a change touches its required keys.
Optimizely keeps its client across a revoke and a grant, instead of closing it.

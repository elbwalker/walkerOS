---
'@walkeros/web-destination-segment': patch
'@walkeros/web-destination-plausible': patch
---

The Segment and Plausible step examples name their vendor calls as a simulation
records them: `analytics.load.track`, `analytics.load.identify` and the other
methods of the instance `load()` returns, and `window.plausible`. Running the
examples now matches their expected calls.

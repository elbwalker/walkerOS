---
'@walkeros/web-destination-fullstory': patch
---

The failure example for a FullStory SDK that throws while it starts says what is
reported: the push fails and can be retried. A blocked or unreachable fs.js
script throws nothing, so it is not reported.

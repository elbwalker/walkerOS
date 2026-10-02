---
'@walkeros/cli': patch
---

Web flows with the Mixpanel or PostHog destination can now be pushed and
simulated. Simulating a web flow no longer loads vendor scripts, and simulating
a source no longer starts the flow's destinations. A web push records
XMLHttpRequest calls like fetch and sendBeacon, listed as `networkCalls` in
`--json`.

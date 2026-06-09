---
'@walkeros/core': minor
'@walkeros/cli': minor
---

Trace telemetry now activates at runtime by polling the deployment's trace
window, so web and server flows start and stop full-payload recording without a
redeploy. A future trace window upgrades a flow to full inbound and outbound
recording, and a null or past window reverts to the flow's `observe` baseline
and self-expires.

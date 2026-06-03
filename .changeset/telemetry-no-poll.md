---
'@walkeros/cli': patch
---

The wrapped browser bundle can now install a telemetry observer without a trace
poll. When the telemetry options omit `traceUrl`, the bundle emits at a fixed
level with no polling, suited to short-lived, URL-opted-in sessions. Bundles
that pass `traceUrl` keep the existing poll behavior.

---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/web-destination-api': minor
'@walkeros/web-destination-gtag': minor
'@walkeros/cli': minor
---

Flow observation records now carry per-event journey correlation: a W3C
`traceparent` links a web send to the server flow that receives it, plus the
originating source id and a monotonic sequence that makes dropped telemetry
visible. At trace level, destinations can opt in to recording their outgoing
vendor calls.

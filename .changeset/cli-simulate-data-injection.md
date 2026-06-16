---
'@walkeros/cli': patch
---

All four simulate functions (`simulateSource`, `simulateTransformer`,
`simulateCollector`, `simulateDestination`) accept a new `data` option to run an
existing bundle with updated configuration values, without rebundling. The new
`buildDataPayload`, `classifyStepProperties`, and `containsCodeMarkers` exports
build and inspect that payload. Destination simulation results now include
`mappingKey`, the entity-action key of the matched mapping rule.

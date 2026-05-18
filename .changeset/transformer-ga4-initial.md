---
'@walkeros/transformer-ga4': patch
'@walkeros/collector': patch
---

Add `@walkeros/transformer-ga4`: GA4 Measurement Protocol v2 decoder transformer
with default mappings for 33 standard events. Server-side use via
`source-express` in the `before` chain.

Also: fix collector to preserve fan-out in `source.before` chains. Previously,
when a before-transformer returned an array of events, only the first survived.
This enables vendor-protocol decoders (GA4, Segment, Snowplow, etc.) to fan a
batched request into N walkerOS events.

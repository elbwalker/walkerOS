---
'@walkeros/server-destination-posthog': patch
---

The `flushAt` and `flushInterval` descriptions now say that every push and batch
flushes the SDK, `personalApiKey` and `featureFlagsPollingInterval` say that the
destination evaluates no feature flags, and `disableGeoip` states its default of
`true`. Step examples that depend on destination config name it, with timestamps
in milliseconds.

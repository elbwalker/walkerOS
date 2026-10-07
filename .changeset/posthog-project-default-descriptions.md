---
'@walkeros/web-destination-posthog': patch
---

The `capture_heatmaps` and `capture_exceptions` descriptions now say that, when
unset, the PostHog project setting decides. The `identify` and `group`
descriptions say when the calls repeat. The step examples name the destination
config they rely on, and the login example uses a millisecond timestamp.

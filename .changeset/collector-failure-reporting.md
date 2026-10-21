---
'@walkeros/collector': patch
---

Failures are explicit. A failing `init`, an open circuit breaker, a destination
held past one retry window, a full pre-run queue and a throwing transformer
answer `failed` or `ok: false` with a `reason`; consent waits stay `queued`. The
collector writes one ERROR line per cause and minute, with a `suppressed` count,
and never the event payload.

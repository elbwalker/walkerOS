---
'@walkeros/runner': patch
---

The runtime now masks the values of the secrets it fetches from the app in every
log line after the fetch: its own logs, the flow's logs, the recent errors and
log lines sent with heartbeats, and the `--json` error output. Values from
`--env-file` or the container environment are still covered by pattern rules
only.

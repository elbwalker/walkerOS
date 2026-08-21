---
'@walkeros/server-transformer-bot': patch
---

Bot detection now scores all sixteen request signals instead of the user agent
alone, and emits one `botScore` with a `botCategory`, `botProduct` and reason
codes. This replaces the old output: `agentScore` is removed, score values
changed, and `settings.output` takes `string | false`. New settings: `context`
and `suspiciousAt`.

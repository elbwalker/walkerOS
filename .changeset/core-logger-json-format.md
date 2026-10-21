---
'@walkeros/core': patch
---

`logger.format: 'json'` prints one JSON object per line on server flows, with
`severity`, `message`, `time`, `scope` and `context`; errors and warnings go to
stderr. Web flows reject it. A log handler receives the cause code, status,
retryable flag and suppressed count as structured fields, so lines can be
forwarded without parsing.

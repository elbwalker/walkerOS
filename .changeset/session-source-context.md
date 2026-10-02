---
'@walkeros/web-source-session': minor
---

`session start` now carries `source.type: "session"` with the page `url` and
`referrer`, like browser and dataLayer events, so destinations see the landing
URL with its campaign parameters. Before, it arrived as a collector event
without page context.

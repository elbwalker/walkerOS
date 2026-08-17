---
'@walkeros/web-source-browser': minor
'@walkeros/web-source-datalayer': minor
'@walkeros/web-source-session': minor
'@walkeros/source-demo': minor
---

Web sources now send events through the collector's source pipeline, so
`next`/`before` chains, source mapping, `cache`, `state` and per-source status
work on web like they do on server. Walker commands are unaffected and still go
straight to the collector. Flows that already configured these fields on a web
source will see them take effect for the first time.

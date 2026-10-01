---
'@walkeros/web-source-cmp-cookiefirst': patch
---

Simulating the CookieFirst source now records one `walker consent` per example,
as a browser does. The example trigger no longer replays `cf_init` after the
initial consent read. Runtime behaviour is unchanged.

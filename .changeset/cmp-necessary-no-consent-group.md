---
'@walkeros/web-source-cmp-cookiefirst': patch
'@walkeros/web-source-cmp-cookiepro': patch
'@walkeros/web-source-cmp-usercentrics': patch
---

Strictly necessary cookies no longer grant `functional`. CookieFirst's
`necessary` category and CookiePro's `C0001` are now reported as `necessary`, so
`functional` follows the visitor's choice for functional cookies. Steps that
require `functional`, such as the session source with `consent: 'functional'`,
now wait for that choice. When several categories map to the same group, the
group is now granted only if all of them are, as in the Usercentrics source.
CookiePro maps `C0005` (Social Media) to its own `social` group instead of
`marketing`, so a step for social media cookies requires `social`. CookieFirst
and Usercentrics match `categoryMap` keys case-insensitively, like the other CMP
sources.

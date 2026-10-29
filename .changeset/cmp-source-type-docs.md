---
'@walkeros/web-source-cmp-usercentrics': patch
'@walkeros/web-source-cmp-cookiefirst': patch
---

The Usercentrics source no longer declares a `ucEvent` window event type it
never listens to, and its docs name the events it reads, `UC_UI_INITIALIZED` and
`UC_UI_CMP_EVENT`. The CookieFirst example mock of `elb` is typed without a
cast.

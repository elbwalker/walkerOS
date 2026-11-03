---
'@walkeros/web-source-cmp-cookiebot': patch
---

New Cookiebot consent source. It reads the visitor's choice from
`window.Cookiebot` and Cookiebot's accept and decline events, and maps
`preferences`, `statistics` and `marketing` to `functional`, `analytics` and
`marketing`. Strictly necessary cookies are reported as `necessary` and grant no
consent group. Implied consent is skipped unless `explicitOnly` is `false`, so
by default a visitor Cookiebot never asks sends no consent.

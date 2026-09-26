---
'@walkeros/core': patch
---

`walkeros validate` now checks references under `mapping` and `settings` keys
named `title` or `description`, which were skipped as prose before, so a
`$secret` there in a web flow is now an error. Still skipped: step, example and
flow titles and descriptions, `$comment`, and contract JSON Schemas.

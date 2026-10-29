---
'@walkeros/server-destination-mixpanel': patch
---

The step examples that depend on destination config now name it in their
descriptions, including that a track call carries no `distinct_id` without
`settings.identify` and that `/import` needs `settings.secret`. Their timestamps
are in milliseconds. The `include` setting description now says that it has no
effect: use `include` in the destination config.

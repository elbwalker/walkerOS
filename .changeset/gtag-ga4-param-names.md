---
'@walkeros/web-destination-gtag': minor
---

GA4 parameter names carrying characters GA4 rejects are now rewritten, so a
tagged `creative-type` arrives as `data_creative_type` instead of going missing.
`source_platform` and `user_id` are no longer sent: GA4 reads the first as a
manual campaign and reports that traffic as Unassigned. Event names are
unchanged.

---
'@walkeros/web-destination-linkedin': patch
---

The `conversion` mapping description now says what happens when the conversion
resolves to no id: no `lintrk` call is made and the push fails with
`missing-input`. It no longer says such events are ignored, and it names the
server LinkedIn destination as the deduplication partner of `eventId`.

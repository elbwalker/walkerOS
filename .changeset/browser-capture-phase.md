---
'@walkeros/web-source-browser': minor
---

Click and submit triggers now fire in the capture phase, reading tagged elements
at click time. This fixes lost tagging in single-page apps where a click
re-renders and unmounts the tagged element (events previously fell back to
`page` with no data), and means `stopPropagation` no longer suppresses a tagged
click. Set `capture: false` on the source to restore the previous bubble-phase
behavior.

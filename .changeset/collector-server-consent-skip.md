---
'@walkeros/collector': patch
---

New `consentDenied: 'skip'` makes a server collector skip an event that a
destination's consent does not allow, instead of queueing it for a grant that
never comes. It counts in `skipped` and logs at DEBUG, never as an error. A
destination without `init` is initialized without one, so its `on` handlers run.

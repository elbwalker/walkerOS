---
'@walkeros/web-source-browser': patch
---

Fixes `elb('walker init', scope)` which previously did nothing. Calling
`walker init` with a DOM element, an array of elements, or with no argument
(defaults to `document`) now re-scans the scope for `data-elb*` tags and fires
`load` triggers on the matched elements, matching the documented contract for
SPA and infinite-scroll re-initialization.

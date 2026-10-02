---
'@walkeros/walker.js': patch
---

Every dataLayer push now carries `globals`, also when it is empty. With
`_clear: true`, GTM no longer keeps the previous page's globals after a
single-page app route change to a page without `data-elbglobals`.

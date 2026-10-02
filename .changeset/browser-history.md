---
'@walkeros/web-source-browser': minor
---

New `history` setting for single-page apps: every route change (pushState,
replaceState with a new path, back and forward) sends a page view, and tagged
elements are picked up as the new route renders. Off by default. Page views
after the first now carry the previous page's URL as `data.referrer`.

---
'@walkeros/walker.js': minor
---

walker.js is now one ready-made file: one script tag from static.walkeros.io
pushes every data-elb event to window.dataLayer for GTM. Route changes send page
views, so remove route-change walker run calls. Configuration is gone
(elbConfig, data-elbconfig, createWalkerjs, the dataLayer source, ES5 build); to
keep a configured setup, pin @walkeros/walker.js@4.6.1 instead of @latest.

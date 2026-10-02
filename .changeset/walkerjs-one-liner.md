---
'@walkeros/walker.js': minor
---

walker.js is now one ready-made file: add a single script tag from
static.walkeros.io and every data-elb event lands in window.dataLayer with an
event key for GTM triggers. Route changes send page views by themselves, so
remove route-change walker run calls. It reads no configuration: elbConfig,
data-elbconfig, createWalkerjs, the dataLayer source and the ES5 build are gone.

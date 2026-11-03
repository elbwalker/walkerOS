---
'@walkeros/core': patch
'@walkeros/cli': patch
'@walkeros/server-source-fetch': patch
'@walkeros/server-destination-criteo': patch
'@walkeros/web-source-browser': patch
'@walkeros/web-source-datalayer': patch
'@walkeros/web-source-cmp-cookiepro': patch
'@walkeros/web-source-cmp-usercentrics': patch
'@walkeros/web-source-cmp-cookiefirst': patch
'@walkeros/server-source-aws': patch
'@walkeros/server-source-gcp': patch
---

The Fetch `path` setting is described as a single route path that `paths`
overrides, and it is no longer marked deprecated. The Criteo Quickstart uses a
numeric `partnerId` placeholder. Type docs now say that an open breaker fails
events with `breaker-open` and that server bundles target Node 20. Example env
mocks are typed without casts.

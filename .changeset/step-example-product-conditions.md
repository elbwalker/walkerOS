---
'@walkeros/web-destination-matomo': patch
'@walkeros/web-destination-piwikpro': patch
'@walkeros/server-destination-piwikpro': patch
---

The ecommerce step examples now test for a product entity without a package
helper. The published condition, shown in the docs and returned by
`package_get`, referenced a minified import and threw when copied into a flow;
it now runs on its own.

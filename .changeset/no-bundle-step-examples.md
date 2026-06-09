---
'@walkeros/web-source-browser': patch
'@walkeros/source-demo': patch
'@walkeros/destination-demo': patch
'@walkeros/web-destination-snowplow': patch
'@walkeros/server-source-fetch': patch
'@walkeros/server-source-aws': patch
'@walkeros/server-source-gcp': patch
'@walkeros/server-destination-api': patch
'@walkeros/server-destination-sqlite': patch
'@walkeros/transformer-demo': patch
'@walkeros/web-source-cmp-cookiefirst': patch
'@walkeros/web-source-cmp-cookiepro': patch
'@walkeros/web-source-cmp-usercentrics': patch
'@walkeros/web-source-datalayer': patch
---

Step examples are no longer bundled into production output. They were
accidentally exported from the production entry of these packages and pulled
into bundled JS. Examples remain available via the package `./dev` subpath for
simulation and testing.

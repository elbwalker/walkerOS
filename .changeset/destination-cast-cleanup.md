---
'@walkeros/web-destination-plausible': patch
'@walkeros/web-destination-piwikpro': patch
'@walkeros/web-destination-meta': patch
'@walkeros/web-destination-snowplow': patch
'@walkeros/web-destination-gtag': patch
'@walkeros/web-destination-api': patch
---

Internal type-safety cleanup: removed unsafe casts around browser globals and
env mocks by typing each destination's `Env` and reading globals through
`getEnv<Env>(env)`. No behavior change.

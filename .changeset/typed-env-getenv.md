---
'@walkeros/web-core': minor
'@walkeros/web-destination-plausible': patch
'@walkeros/web-destination-piwikpro': patch
'@walkeros/web-destination-meta': patch
'@walkeros/web-destination-snowplow': patch
'@walkeros/web-destination-gtag': patch
'@walkeros/web-destination-api': patch
---

`getEnv` is now generic over a destination's `Env`. Passing your env type
(`getEnv<Env>(env)`) returns `window`/`document` as the real DOM globals merged
with your declared SDK shape, so destinations no longer cast browser globals
(`as Window`/`as Document`) at the call site. The built-in web destinations now
type their `Env` and read globals through `getEnv<Env>(env)`, removing the
unsafe casts around browser globals and env mocks. No behavior change.

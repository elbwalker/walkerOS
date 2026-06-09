---
'@walkeros/web-core': minor
---

`getEnv` is now generic over a destination's `Env`. Passing your env type
(`getEnv<Env>(env)`) returns `window`/`document` as the real DOM globals merged
with your declared SDK shape, so destinations no longer need to cast browser
globals (`as Window`/`as Document`) at the call site.

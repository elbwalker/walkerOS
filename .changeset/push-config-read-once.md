---
'@walkeros/cli': patch
---

`walkeros push` reads the flow config once per run, for simulations and real
pushes alike, so a config fetched from a URL is requested once and the bundle
and the masked secret values always come from the same content.

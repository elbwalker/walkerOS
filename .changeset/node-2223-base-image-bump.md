---
'@walkeros/cli': patch
---

Update the runtime Docker base image to Node.js 22.23.0, which patches the
Node.js June 2026 security release. The `walkeros/flow` and `walkeros/cli`
images now pin a fixed, digest-locked Node version.

---
'@walkeros/cli': patch
---

Stop auto-setting config.mock on simulated destinations. The /dev export's fake
env now handles safety while wrapEnv tracks all API calls (init and push). User
--mock flag is unchanged.

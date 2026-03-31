---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/cli': minor
---

Wire initConfig.hooks into collector instance. Simplify simulate paths to use prePush/postDestinationPush hooks instead of manual collector.push overrides and wrapEnv tracking. Source simulation timing issue resolved — hooks are wired by startFlow before events fire.

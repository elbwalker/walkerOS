---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/cli': minor
---

Wire initConfig.hooks into collector instance. Simulation uses
prePush/postDestinationPush hooks for event capture. Hooks are wired by
startFlow before events fire.

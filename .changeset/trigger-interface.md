---
'@walkeros/core': minor
---

Add Trigger type interface for standardized source invocation in simulation and
testing. Web sources rename `setup` to `trigger` (Trigger.SetupFn), server
sources add `createTrigger(instance)` factories. SetupFn and SimulationEnv moved
from Source to Trigger namespace.

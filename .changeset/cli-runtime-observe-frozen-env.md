---
'@walkeros/cli': patch
---

`walkeros run` reads two new environment variables. `WALKEROS_OBSERVE_LEVEL`
sets the runtime's baseline telemetry level (`off`, `standard`, or `trace`).
`WALKEROS_CONFIG_FROZEN` (`1` or `true`) serves the bundle as an immutable
snapshot: secrets are still injected at boot, but config hot-swap and heartbeat
are disabled.

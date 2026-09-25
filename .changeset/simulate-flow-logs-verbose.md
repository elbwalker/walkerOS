---
'@walkeros/cli': patch
---

Simulate now always sends the flow's own log lines through the CLI logger, so
known secret values are masked in them too, and they go to stderr with `--json`.
As a result, the flow's debug lines appear only with `--verbose`. A real push
keeps the flow's own logger.

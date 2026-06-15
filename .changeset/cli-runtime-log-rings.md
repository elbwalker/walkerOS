---
'@walkeros/cli': patch
---

The managed flow runner now reports its recent errors and recent log output in
its heartbeat, so deployed flows can surface runtime errors and logs in the app
without any external log tooling. Secrets are redacted before leaving the
runner.

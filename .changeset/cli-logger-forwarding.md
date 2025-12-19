---
'@walkeros/cli': patch
---

Fix consistent logger forwarding across CLI commands

- Remove duplicate `createCollectorLoggerConfig` from push command, import from
  core
- Fix simulate command to use `collector.push` instead of `elb()` (same pattern
  as push)
- Add logger forwarding to simulate command via `executeInNode`
- Add logger forwarding to run command via `runFlow`
